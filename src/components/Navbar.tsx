import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, LogOut } from 'lucide-react'
import { supabase } from '../utils/supabaseClient'

const Navbar: React.FC = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
          <Phone size={24} />
          <span>Call Wave</span>
        </Link>
        <div className="space-x-4 flex items-center">
          <Link to="/" className="hover:text-blue-200">
            Campaigns
          </Link>
          <Link to="/create" className="hover:text-blue-200">
            Create Campaign
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center hover:text-blue-200"
          >
            <LogOut size={20} className="mr-1" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar