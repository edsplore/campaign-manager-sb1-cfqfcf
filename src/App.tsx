import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabaseClient'
import Navbar from './components/Navbar'
import CampaignCreation from './components/CampaignCreation'
import CampaignList from './components/CampaignList'
import BulkDialing from './components/BulkDialing'
import Auth from './components/Auth'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {session && <Navbar />}
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route
              path="/"
              element={
                session ? (
                  <CampaignList />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/create"
              element={
                session ? (
                  <CampaignCreation />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/campaign/:id"
              element={
                session ? (
                  <BulkDialing />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/auth"
              element={
                !session ? (
                  <Auth />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App