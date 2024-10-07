// Import statements
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, BarChart2 } from 'lucide-react';
import {
  getCampaign,
  updateCampaign,
  getContacts,
  updateContact,
  addCallLog,
  getCallLogs,
  updateCallLog,
  Campaign,
  Contact,
  CallLog,
} from '../utils/db';

// Interface definitions
interface ConcurrencyStatus {
  current_concurrency: number;
  concurrency_limit: number;
}

interface CallResponse {
  call_id: string;
  call_status: string;
}

interface CallDetails {
  disconnection_reason: string;
  call_transcript: string;
  call_summary: string;
  call_recording: string;
  start_time: string;
}

// Move ContactsPopup outside of BulkDialing
interface ContactsPopupProps {
  setShowContactsPopup: (value: boolean) => void;
  contacts: Contact[];
}

const ContactsPopup: React.FC<ContactsPopupProps> = ({
  setShowContactsPopup,
  contacts,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowContactsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowContactsPopup]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] relative flex flex-col"
      >
        <button
          onClick={() => setShowContactsPopup(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4">Campaign Contacts</h2>
        <div ref={scrollContainerRef} className="overflow-y-auto flex-grow">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">First Name</th>
                <th className="px-4 py-2 text-left">Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => (
                <tr key={contact.id || index} className="border-b">
                  <td className="px-4 py-2">{contact.firstName}</td>
                  <td className="px-4 py-2">{contact.phoneNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// BulkDialing component
const BulkDialing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dialingStatus, setDialingStatus] = useState<
    'idle' | 'dialing' | 'completed'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showContactsPopup, setShowContactsPopup] = useState(false);
  const [concurrencyStatus, setConcurrencyStatus] =
    useState<ConcurrencyStatus | null>(null);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getConcurrencyStatus = useCallback(
    async (retellApiKey: string): Promise<ConcurrencyStatus | null> => {
      try {
        const response = await axios.get(
          'https://api.retellai.com/get-concurrency',
          {
            headers: {
              Authorization: `Bearer ${retellApiKey}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching concurrency status:', error);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    const loadCampaignData = async () => {
      if (id) {
        try {
          const campaignData = await getCampaign(parseInt(id, 10));
          if (campaignData) {
            setCampaign(campaignData);
            const contactsData = await getContacts(campaignData.id!);
            setContacts(contactsData);
            const callLogsData = await getCallLogs(campaignData.id!);
            setCallLogs(callLogsData);
            console.log(`Loaded campaign with ${contactsData.length} contacts`);
          } else {
            setError('Campaign not found');
          }
        } catch (err) {
          setError('Error loading campaign data');
          console.error('Error loading campaign data:', err);
        }
      }
    };
    loadCampaignData();
  }, [id]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateConcurrencyStatus = async () => {
      if (campaign && campaign.retellApiKey) {
        const status = await getConcurrencyStatus(campaign.retellApiKey);
        if (status) {
          setConcurrencyStatus(status);
        }
      }
    };

    if (campaign && campaign.retellApiKey) {
      updateConcurrencyStatus(); // Initial update
      intervalId = setInterval(updateConcurrencyStatus, 1000); // Update every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [campaign, getConcurrencyStatus]);

  const createPhoneCall = useCallback(
    async (
      fromNumber: string,
      toNumber: string,
      agentId: string,
      firstName: string,
      retellApiKey: string
    ): Promise<CallResponse | null> => {
      const data = {
        from_number: fromNumber,
        to_number: '+' + toNumber,
        override_agent_id: agentId,
        retell_llm_dynamic_variables: {
          first_name: firstName,
        },
      };

      try {
        const response = await axios.post(
          'https://api.retellai.com/v2/create-phone-call',
          data,
          {
            headers: {
              Authorization: `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error creating phone call:', error);
        return null;
      }
    },
    []
  );

  const startBulkDialing = useCallback(async () => {
    if (!campaign || !contacts.length) return;
    if (campaign.hasRun) {
      alert('This campaign has already been run and cannot be run again.');
      return;
    }
    setDialingStatus('dialing');
    let calledCount = 0;
    const totalContacts = contacts.length;
    console.log(`Starting bulk dialing for ${totalContacts} contacts`);

    await updateCampaign(campaign.id!, { status: 'In Progress', hasRun: true });

    for (const contact of contacts) {
      while (true) {
        const concurrencyStatus = await getConcurrencyStatus(
          campaign.retellApiKey
        );
        if (!concurrencyStatus) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const { current_concurrency, concurrency_limit } = concurrencyStatus;

        if (current_concurrency < concurrency_limit) {
          const callResponse = await createPhoneCall(
            campaign.outboundNumber,
            contact.phoneNumber,
            campaign.agentId,
            contact.firstName,
            campaign.retellApiKey
          );

          if (callResponse) {
            calledCount++;
            const newProgress = Math.round((calledCount / totalContacts) * 100);
            setProgress(newProgress);
            await updateCampaign(campaign.id!, { progress: newProgress });
            await updateContact(contact.id!, { callId: callResponse.call_id });
            await addCallLog({
              campaignId: campaign.id!,
              phoneNumber: contact.phoneNumber,
              firstName: contact.firstName,
              callId: callResponse.call_id,
            });
            setCallLogs((prevLogs) => [
              ...prevLogs,
              {
                id: Date.now(), // Temporary ID for rendering
                campaignId: campaign.id!,
                phoneNumber: contact.phoneNumber,
                firstName: contact.firstName,
                callId: callResponse.call_id,
              },
            ]);
            console.log(
              `Contact ${contact.firstName} called successfully (${calledCount}/${totalContacts})`
            );
            break;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    setDialingStatus('completed');
    await updateCampaign(campaign.id!, { status: 'Completed', progress: 100 });
  }, [campaign, contacts, getConcurrencyStatus, createPhoneCall]);

  const analyzeCallLogs = async () => {
    if (!campaign) return;
    setIsAnalyzing(true);
    const logs = await getCallLogs(campaign.id!);
    for (const log of logs) {
      try {
        const response = await axios.get(
          `https://api.retellai.com/v2/get-call/${log.callId}`,
          {
            headers: {
              Authorization: `Bearer ${campaign.retellApiKey}`,
            },
          }
        );
        const callDetails: CallDetails = {
          disconnection_reason: response.data.disconnection_reason || '',
          call_transcript: response.data.transcript || '',
          call_summary: response.data.call_analysis?.call_summary || '',
          call_recording: response.data.recording_url || '',
          start_time: new Date(response.data.start_timestamp).toISOString(),
        };
        await updateCallLog(log.id!, callDetails);
      } catch (error) {
        console.error(`Error analyzing call ${log.callId}:`, error);
      }
    }
    setIsAnalyzing(false);
    // Refresh call logs after analysis
    if (campaign) {
      const updatedLogs = await getCallLogs(campaign.id!);
      setCallLogs(updatedLogs);
    }
  };

  const handleCallLogClick = (log: CallLog) => {
    setSelectedCallLog(log);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Bulk Dialing</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {campaign ? (
        <>
          <h2 className="text-xl font-semibold mb-2">{campaign.title}</h2>
          <p className="mb-4">{campaign.description}</p>
          <p className="mb-2">Status: {dialingStatus}</p>
          <p className="mb-2">Total Contacts: {contacts.length}</p>
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Progress: {progress}%</p>
          </div>
          {concurrencyStatus && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Concurrency Status</h3>
              <p>
                Current Concurrency: {concurrencyStatus.current_concurrency}
              </p>
              <p>Concurrency Limit: {concurrencyStatus.concurrency_limit}</p>
            </div>
          )}
          <div className="flex space-x-4 mb-4">
            {dialingStatus === 'idle' && !campaign.hasRun && (
              <button
                onClick={startBulkDialing}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Start Bulk Dialing
              </button>
            )}
            <button
              onClick={() => setShowContactsPopup(true)}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              View Contacts
            </button>
          </div>
          {campaign.hasRun && (
            <p className="text-yellow-600 mb-4">
              This campaign has already been run and cannot be run again.
            </p>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Call Logs</h3>
            <button
              onClick={analyzeCallLogs}
              disabled={isAnalyzing}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <BarChart2 size={20} className="mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Calls'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Phone Number</th>
                  <th className="px-4 py-2">First Name</th>
                  <th className="px-4 py-2">Call ID</th>
                  <th className="px-4 py-2">Disconnection Reason</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.map((log, index) => (
                  <tr
                    key={log.id || index}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                    } cursor-pointer hover:bg-gray-200`}
                    onClick={() => handleCallLogClick(log)}
                  >
                    <td className="border px-4 py-2">{log.phoneNumber}</td>
                    <td className="border px-4 py-2">{log.firstName}</td>
                    <td className="border px-4 py-2">{log.callId}</td>
                    <td className="border px-4 py-2">
                      {log.disconnection_reason || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedCallLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
                <button
                  onClick={() => setSelectedCallLog(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-bold mb-4">Call Details</h2>
                <p>
                  <strong>Phone Number:</strong> {selectedCallLog.phoneNumber}
                </p>
                <p>
                  <strong>First Name:</strong> {selectedCallLog.firstName}
                </p>
                <p>
                  <strong>Call ID:</strong> {selectedCallLog.callId}
                </p>
                <p>
                  <strong>Disconnection Reason:</strong>{' '}
                  {selectedCallLog.disconnection_reason || 'N/A'}
                </p>
                <p>
                  <strong>Start Time:</strong>{' '}
                  {selectedCallLog.start_time || 'N/A'}
                </p>
                <h3 className="text-xl font-semibold mt-4 mb-2">
                  Call Summary
                </h3>
                <p>{selectedCallLog.call_summary || 'No summary available'}</p>
                <h3 className="text-xl font-semibold mt-4 mb-2">
                  Call Transcript
                </h3>
                <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
                  {selectedCallLog.call_transcript || 'No transcript available'}
                </pre>
                {selectedCallLog.call_recording && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">
                      Call Recording
                    </h3>
                    <audio controls src={selectedCallLog.call_recording}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          )}
          {showContactsPopup && (
            <ContactsPopup
              setShowContactsPopup={setShowContactsPopup}
              contacts={contacts}
            />
          )}
        </>
      ) : (
        <p>Loading campaign data...</p>
      )}
    </div>
  );
};

export default BulkDialing;
