import React from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
          <Phone size={24} />
          <span>Campaign Manager</span>
        </Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-blue-200">Campaigns</Link>
          <Link to="/create" className="hover:text-blue-200">Create Campaign</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;