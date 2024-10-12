import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { addCampaign, addContacts, Campaign, Contact } from '../utils/db';
import { supabase } from '../utils/supabaseClient';

const CampaignCreation: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [retellApiKey, setRetellApiKey] = useState('');
  const [outboundNumber, setOutboundNumber] = useState('');
  const [contacts, setContacts] = useState<
    Omit<Contact, 'id' | 'campaignId'>[]
  >([]);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsedContacts: Omit<Contact, 'id' | 'campaignId'>[] = data
          .slice(1)
          .map((row: any) => ({
            phoneNumber: row[0],
            firstName: row[1],
          }))
          .filter((contact) => contact.phoneNumber && contact.firstName);
        setContacts(parsedContacts);
        console.log(`Parsed ${parsedContacts.length} contacts`);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to create a campaign');
      navigate('/auth');
      return;
    }

    const campaign: Omit<Campaign, 'id'> = {
      title,
      description,
      agentId,
      retellApiKey,
      outboundNumber,
      status: 'Scheduled',
      progress: 0,
      hasRun: false,
      userId: user.id,
    };

    try {
      const campaignId = await addCampaign(campaign);
      await addContacts(
        contacts.map((contact) => ({ ...contact, campaignId }))
      );
      alert(`Campaign created successfully with ${contacts.length} contacts!`);
      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    }
  };

  if (!user) {
    return <div>Please log in to create a campaign.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create New Campaign</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows={3}
          ></textarea>
        </div>
        <div className="mb-4">
          <label
            htmlFor="agentId"
            className="block text-sm font-medium text-gray-700"
          >
            Agent ID
          </label>
          <input
            type="text"
            id="agentId"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="retellApiKey"
            className="block text-sm font-medium text-gray-700"
          >
            Retell API Key
          </label>
          <input
            type="text"
            id="retellApiKey"
            value={retellApiKey}
            onChange={(e) => setRetellApiKey(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="outboundNumber"
            className="block text-sm font-medium text-gray-700"
          >
            Outbound Number
          </label>
          <input
            type="tel"
            id="outboundNumber"
            value={outboundNumber}
            onChange={(e) => setOutboundNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="contactsFile"
            className="block text-sm font-medium text-gray-700"
          >
            Upload Contacts (Excel file)
          </label>
          <input
            type="file"
            id="contactsFile"
            onChange={handleFileUpload}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
            accept=".xlsx,.xls"
            required
          />
        </div>
        {contacts.length > 0 && (
          <p className="mb-4 text-sm text-gray-600">
            {contacts.length} contacts loaded
          </p>
        )}
        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Campaign
        </button>
      </form>
    </div>
  );
};

export default CampaignCreation;
