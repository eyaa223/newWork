import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';

// Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import AdminDashboard from './dashboards/AdminDashboard';
import AvocatDashboard from './dashboards/AvocatDashboard';
import AssociationDashboard from './dashboards/DashboardAssociation';
import AssociationListPage from './pages/AssociationsListPage'; // 🔹 nouveau
import DemandeFormPage from './pages/DemandeAssociation'; // 🔹 nouveau
import AboutUs from './pages/AboutUs';
import RegisterDonneur from './pages/RegisterDonneur';
import DashboardDonneur from './dashboards/DashboardDonneur';
import CreateDon from './pages/CreateDon';
import DemandeForm from './pages/DemandeBeneficiaire';
import DashboardBeneficiaire from './dashboards/DashboardBeneficiaire'; 
import AssociationDetailsPage from './pages/AssociationDetailsPage';
import SetPassword from './pages/SetPassword';
import Chatbot from './pages/Chatbot'; // chemin selon ton projet
import ChatbotWidget from './components/ChatbotWidget'; 

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/avocat/dashboard" element={<AvocatDashboard />} />
          <Route path="/association/dashboard" element={<AssociationDashboard />} />

          {/* 🔹 Liste de toutes les associations */}
          <Route path="/associations" element={<AssociationListPage />} />

          {/* 🔹 Page d'une association (bénéficiaires) */}
          <Route path="/demande" element={<DemandeFormPage />} /> {/* 🔹 route du formulaire */}
          <Route path="/about" element={<AboutUs />} />
          <Route path="/register-donneur" element={<RegisterDonneur />} />
          <Route path="/dashboard-donneur" element={<DashboardDonneur />} />
          <Route path="/create-don/:id" element={<CreateDon />} />
          <Route path="/demande-aide" element={<DemandeForm />} />
          <Route path="/dashboard-beneficiaire" element={<DashboardBeneficiaire />} />
          <Route path="/association/:id" element={<AssociationDetailsPage />} />
          <Route path="/set-password/:token" element={<SetPassword />} />
          <Route path="/chatbot" element={<Chatbot />} /> {/* Route chatbot */}
          <Route path="/chatbot-widget" element={<ChatbotWidget />} /> {/* Route widget chatbot */}

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
