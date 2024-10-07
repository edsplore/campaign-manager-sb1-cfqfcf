import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Users, Trash2 } from 'lucide-react';
import { getCampaigns, deleteCampaign, Campaign } from '../utils/db';

const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      const fetchedCampaigns = await getCampaigns();
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(id);
        await fetchCampaigns(); // Refresh the list after deletion
      } catch (err) {
        console.error('Error deleting campaign:', err);
        setError('Failed to delete campaign. Please try again.');
      }
    }
  };

  if (loading) {
    return <p className="text-center">Loading campaigns...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Campaigns</h1>
      {campaigns.length === 0 ? (
        <p className="text-center text-gray-500">
          No campaigns found. Create a new campaign to get started!
        </p>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="relative">
                <Link
                  to={`/campaign/${campaign.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {campaign.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            campaign.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : campaign.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {campaign.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          Contacts
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(campaign.id!);
                          }}
                          className="mr-4 p-1 text-red-600 hover:text-red-800"
                          title="Delete Campaign"
                        >
                          <Trash2 size={18} />
                        </button>
                        <Phone className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>View Details</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CampaignList;