import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, Clock, AlertTriangle, Wifi, Phone, Package, Zap } from "lucide-react";
// Assuming API_URL is configured in a central config file
// import { API_URL } from "../config/config"; 
import { ToastContainer, toast } from "react-toastify";

// Mock API_URL for demonstration purposes if not available
const API_URL = "http://localhost:5000"; 

const UserPortal = () => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(30);
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState(""); // 'pending', 'confirmed', 'failed'
  const [isLoading, setIsLoading] = useState(false);
  const [macAddress, setMacAddress] = useState("LOADING...");

  // --- Data for WiFi Packages ---
  // Added more details and refined colors for a better look.
  const packages = [
    { label: "24 Hours", value: 30, price: "Ksh 30", speed: "5 Mbps", color: "blue", icon: <Clock className="w-6 h-6" /> },
    { label: "12 Hours", value: 20, price: "Ksh 20", speed: "4 Mbps", color: "purple", icon: <Clock className="w-6 h-6" /> },
    { label: "4 Hours", value: 15, price: "Ksh 15", speed: "3 Mbps", color: "green", icon: <Clock className="w-6 h-6" /> },
    { label: "1 Hour", value: 10, price: "Ksh 10", speed: "2 Mbps", color: "yellow", icon: <Clock className="w-6 h-6" /> },
  ];

  // --- Effect to fetch MAC address and load CSS ---
  useEffect(() => {
    // Dynamically load react-toastify CSS to avoid build errors
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/react-toastify@9.1.3/dist/ReactToastify.min.css';
    document.head.appendChild(link);

    const fetchMacAddress = async () => {
      try {
        // This approach gets the public IP, but getting a MAC address from a client's browser is not directly possible
        // for security reasons. This is a common challenge in web-based portals.
        // The backend would typically get the MAC from the network layer (e.g., RADIUS server).
        // For this demo, we'll simulate it.
        const res = await axios.get("https://api64.ipify.org?format=json");
        const ip = res.data.ip;
        
        // In a real scenario, you might have an endpoint that maps the user's source IP to a MAC address
        // on your local network gateway.
        // const macRes = await axios.get(`${API_URL}/api/get-mac?ip=${ip}`);
        // setMacAddress(macRes.data.mac || "00:1A:2B:3C:4D:5E"); // Fallback MAC

        // Simulating a fetched MAC address for demonstration
        setTimeout(() => setMacAddress("00:1A:2B:3C:4D:5E"), 1000);

      } catch (error) {
        console.error("Error fetching IP/MAC address:", error);
        setMacAddress("UNAVAILABLE");
        toast.error("Could not retrieve device information.");
      }
    };

    fetchMacAddress();

    // Cleanup function to remove the stylesheet when the component unmounts
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // --- Payment Handling Logic ---
  const handlePayment = async () => {
    // Basic phone number validation
    if (!/^(07|01)\d{8}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number starting with 07 or 01.");
      return;
    }

    setIsLoading(true);
    setStatus("pending"); // Set status to pending immediately

    // Formatting phone number to +254 format
    const formatPhoneNumber = (num) => `+254${num.substring(1)}`;
    const formattedPhone = formatPhoneNumber(phone);

    try {
      // --- API Call to Initiate Payment ---
      const response = await axios.post(`${API_URL}/api/mpesa/pay`, {
        phone: formattedPhone,
        amount,
        mac_address: macAddress,
      });

      if (response.data.success) {
        setTransactionId(response.data.transactionId);
        toast.success("Payment request sent! Please check your phone to complete the payment.");
        // Here you would typically start polling a status check endpoint
      } else {
        setStatus("failed");
        toast.error(response.data.message || "Payment request failed. Please try again.");
      }
    } catch (error) {
      setStatus("failed");
      console.error("Payment API error:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Helper to get color classes for borders and text ---
  const getColorClasses = (color, type) => {
    const colorMap = {
      blue: { border: "border-blue-400", text: "text-blue-300", shadow: "shadow-blue-500/50" },
      purple: { border: "border-purple-400", text: "text-purple-300", shadow: "shadow-purple-500/50" },
      green: { border: "border-green-400", text: "text-green-300", shadow: "shadow-green-500/50" },
      yellow: { border: "border-yellow-400", text: "text-yellow-300", shadow: "shadow-yellow-500/50" },
    };
    return colorMap[color]?.[type] || "";
  };


  return (
    <>
      {/* ToastContainer is required for react-toastify to work */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-slate-900 text-white p-4 overflow-hidden">
        {/* Animated background gradient shapes for a modern feel */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-green-600 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* Main Glassmorphism Card */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Card Header */}
            <div className="p-6 border-b border-white/10 text-center">
              <div className="inline-flex items-center justify-center bg-blue-500/20 p-3 rounded-full mb-3">
                <Wifi className="h-8 w-8 text-blue-300" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Qonnect WiFi</h1>
              <p className="text-sm text-slate-300 mt-1">High-Speed Internet Access</p>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6">
              
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phone" className="flex items-center text-sm font-medium text-slate-300 mb-2">
                  <Phone className="w-4 h-4 mr-2" /> M-Pesa Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="0712 345 678"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Package Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                  <Package className="w-4 h-4 mr-2" /> Select a Package
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.value}
                      className={`
                        text-center p-3 rounded-xl cursor-pointer border-2 transition-all duration-300
                        bg-slate-800/50 hover:bg-slate-700/70 hover:scale-105
                        ${amount === pkg.value 
                          ? `${getColorClasses(pkg.color, 'border')} ${getColorClasses(pkg.color, 'shadow')}` 
                          : 'border-transparent'
                        }
                      `}
                      onClick={() => setAmount(pkg.value)}
                    >
                      <div className={`font-bold text-lg ${getColorClasses(pkg.color, 'text')}`}>{pkg.price}</div>
                      <div className="text-xs text-slate-300">{pkg.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{pkg.speed}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                className={`w-full flex items-center justify-center py-3 rounded-xl text-white font-semibold transition-all duration-300 ease-in-out
                  ${isLoading 
                    ? "bg-slate-600 cursor-not-allowed" 
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/40 active:scale-95"
                  }
                `}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Pay {packages.find(p => p.value === amount)?.price}
                  </>
                )}
              </button>

              {/* Status Display */}
              {status && (
                <div className={`flex items-center justify-center p-3 rounded-lg text-sm transition-opacity duration-300
                  ${status === 'confirmed' ? 'bg-green-500/20 text-green-300' : ''}
                  ${status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : ''}
                  ${status === 'failed' ? 'bg-red-500/20 text-red-300' : ''}
                `}>
                  {status === 'confirmed' && <CheckCircle className="w-5 h-5 mr-2" />}
                  {status === 'pending' && <Clock className="w-5 h-5 mr-2 animate-pulse" />}
                  {status === 'failed' && <AlertTriangle className="w-5 h-5 mr-2" />}
                  <span className="font-medium capitalize">
                    {
                      status === 'pending' ? 'Awaiting payment confirmation...' :
                      status === 'confirmed' ? 'Payment successful! You are connected.' :
                      'Payment failed. Please try again.'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer Link */}
          <div className="text-center mt-6">
              <a href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors duration-300">
                  Admin Dashboard
              </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserPortal;