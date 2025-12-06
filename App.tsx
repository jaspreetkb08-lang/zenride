
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, Location, RideDetails, VehicleOption, Driver, ChatMessage, RideHistoryItem, PaymentMethod } from './types';
import { VEHICLES, MOCK_DRIVER, DEFAULT_CENTER, PRESET_LOCATIONS, PAYMENT_METHODS } from './constants';
import MapBackground from './components/MapBackground';
import { getRouteInsights, getDriverMessage, getChatResponse } from './services/geminiService';

// --- Helpers ---

// Calculate distance in KM
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

// Get coordinates (Mock Geocoding)
const getCoordinatesFromQuery = (query: string): Location => {
    // Check presets first
    for (const key in PRESET_LOCATIONS) {
        if (query.toLowerCase().includes(key.toLowerCase())) {
            return { ...PRESET_LOCATIONS[key], address: query };
        }
    }
    // Else generate pseudo-random deterministic coord near default center
    const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offsetLat = (hash % 100) / 1000 - 0.05; // +/- 0.05 deg
    const offsetLng = (hash % 50) / 1000 - 0.025;
    
    return {
        lat: DEFAULT_CENTER.lat + offsetLat,
        lng: DEFAULT_CENTER.lng + offsetLng,
        address: query
    };
};

const MOCK_HISTORY: RideHistoryItem[] = [
    {
      id: 'ride-123',
      date: new Date(Date.now() - 86400000).toISOString(),
      pickup: 'Mumbai Airport',
      dropoff: 'Juhu Beach',
      vehicle: 'Sedan',
      price: 345,
      paymentMethod: 'UPI',
      status: 'COMPLETED'
    },
    {
      id: 'ride-124',
      date: new Date(Date.now() - 172800000).toISOString(),
      pickup: 'Andheri Station',
      dropoff: 'Versova Beach',
      vehicle: 'Auto Rickshaw',
      price: 85,
      paymentMethod: 'CASH',
      status: 'COMPLETED'
    }
];

// --- Sub-components ---

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 bg-slate-50/90 backdrop-blur-sm animate-fade-in">
    <div className="w-full max-w-md space-y-8">
      <div className="text-center transform transition-all duration-700 hover:scale-105">
        <div className="mx-auto w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-teal-200/50">
          <i className="fa-solid fa-location-dot text-3xl text-white"></i>
        </div>
        <h1 className="text-4xl font-light text-slate-900 tracking-tight">ZenRide</h1>
        <p className="mt-2 text-slate-500 font-light">Your ride, your vibe.</p>
      </div>
      <div className="bg-white p-8 rounded-3xl shadow-2xl space-y-6 border border-slate-100">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Enter Mobile Number</label>
          <div className="relative group">
            <span className="absolute left-4 top-3.5 text-slate-500 font-medium group-focus-within:text-teal-600">+91</span>
            <input 
              type="tel" 
              className="w-full pl-14 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition font-medium text-lg"
              placeholder="98765 43210" 
            />
          </div>
        </div>
        <button 
          onClick={onLogin}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-300 transition-all transform active:scale-95 flex justify-center items-center gap-2"
        >
          <span>Continue</span>
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
);

const RideHistory: React.FC<{
    history: RideHistoryItem[];
    onBack: () => void;
}> = ({ history, onBack }) => {
    return (
        <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col animate-slide-up">
            <div className="p-4 bg-white shadow-sm border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-slate-900">Your Rides</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <i className="fa-regular fa-clipboard text-4xl mb-3"></i>
                        <p>No rides yet</p>
                    </div>
                ) : (
                    history.slice().reverse().map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <i className={`fa-solid ${item.vehicle === 'Auto Rickshaw' ? 'fa-truck-pickup' : item.vehicle === 'Moto' ? 'fa-motorcycle' : 'fa-car'} text-slate-600`}></i>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-slate-900">{item.vehicle}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">{new Date(item.date).toLocaleString()}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                        <p className="truncate">{item.pickup}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <div className="w-2 h-2 rounded-sm bg-slate-900"></div>
                                        <p className="truncate">{item.dropoff}</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        {item.paymentMethod === 'UPI' && <i className="fa-solid fa-mobile-screen-button text-teal-500"></i>}
                                        {item.paymentMethod === 'CASH' && <i className="fa-solid fa-money-bill-wave text-green-500"></i>}
                                        {item.paymentMethod === 'CARD' && <i className="fa-solid fa-credit-card text-blue-500"></i>}
                                        {item.paymentMethod === 'WALLET' && <i className="fa-solid fa-wallet text-purple-500"></i>}
                                        {item.paymentMethod}
                                    </span>
                                    <span className="font-bold text-slate-900">₹{item.price}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const LocationSearch: React.FC<{ 
  onConfirm: (pickup: Location, dropoff: Location) => void 
}> = ({ onConfirm }) => {
  const [pickupText, setPickupText] = useState("Mumbai Airport");
  const [dropoffText, setDropoffText] = useState("Gateway of India");

  const handleConfirm = () => {
    const pLoc = getCoordinatesFromQuery(pickupText);
    const dLoc = getCoordinatesFromQuery(dropoffText);
    onConfirm(pLoc, dLoc);
  };

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 p-4 pb-8 animate-slide-up">
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Where are you going?</h2>
        <div className="space-y-4 relative">
            <div className="absolute left-5 top-10 bottom-10 w-0.5 bg-slate-300 z-0 border-l border-dashed border-slate-400"></div>
            
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-teal-600">
                    <i className="fa-solid fa-circle-dot text-sm"></i>
                </div>
                <input 
                    value={pickupText}
                    onChange={(e) => setPickupText(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 transition font-medium text-slate-800 placeholder-slate-400 truncate"
                    placeholder="Pickup location"
                />
            </div>
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-900">
                    <i className="fa-solid fa-square text-sm"></i>
                </div>
                 <input 
                    value={dropoffText}
                    onChange={(e) => setDropoffText(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-800 transition font-medium text-slate-800 placeholder-slate-400 truncate"
                    placeholder="Dropoff location"
                />
            </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            {Object.keys(PRESET_LOCATIONS).slice(0, 4).map(name => (
                <button 
                    key={name}
                    onClick={() => setDropoffText(name)}
                    className="px-3 py-1.5 bg-slate-100 text-xs rounded-lg font-medium whitespace-nowrap hover:bg-slate-200 transition"
                >
                    {name}
                </button>
            ))}
        </div>
        <button 
          onClick={handleConfirm}
          className="mt-4 w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:bg-black transition active:scale-95"
        >
          Confirm Locations
        </button>
      </div>
    </div>
  );
};

const VehicleSelection: React.FC<{ 
  onSelect: (vehicle: VehicleOption, time: Date | null, payment: PaymentMethod) => void,
  onBack: () => void,
  distance: number
}> = ({ onSelect, onBack, distance }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  
  const handleBook = () => {
    if (!selectedId) return;
    const vehicle = VEHICLES.find(v => v.id === selectedId);
    if (vehicle) {
      const time = scheduleTime ? new Date(scheduleTime) : null;
      onSelect(vehicle, time, paymentMethod);
    }
  };

  const getDropoffTime = (pickupEta: number) => {
    // Approx speed 24km/h = 2.5 mins per km
    const travelTime = distance * 2.5; 
    const totalMinutes = pickupEta + travelTime;
    return new Date(Date.now() + totalMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectedMethodInfo = PAYMENT_METHODS.find(m => m.id === paymentMethod) || PAYMENT_METHODS[0];

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] h-[75vh] flex flex-col transition-all duration-300 animate-slide-up">
      {/* Payment Selection Overlay */}
      {showPaymentSheet && (
          <div className="absolute inset-0 bg-white z-50 rounded-t-3xl flex flex-col animate-slide-up">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                  <button onClick={() => setShowPaymentSheet(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition">
                      <i className="fa-solid fa-arrow-left text-slate-600"></i>
                  </button>
                  <h3 className="font-bold text-lg text-slate-800">Payment Methods</h3>
              </div>
              <div className="p-4 space-y-2">
                  {PAYMENT_METHODS.map(method => (
                      <div 
                        key={method.id}
                        onClick={() => {
                            setPaymentMethod(method.id);
                            setShowPaymentSheet(false);
                        }}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${paymentMethod === method.id ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:bg-slate-50'}`}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center ${method.color}`}>
                                  <i className={`fa-solid ${method.icon} text-lg`}></i>
                              </div>
                              <span className="font-bold text-slate-700">{method.name}</span>
                          </div>
                          {paymentMethod === method.id && (
                              <i className="fa-solid fa-circle-check text-teal-600 text-xl"></i>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="p-2 flex items-center justify-center">
         <div className="w-12 h-1.5 bg-slate-200 rounded-full mt-2"></div>
      </div>
      <div className="px-5 pb-2 border-b border-slate-50 flex items-center">
         <button onClick={onBack} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-500 transition">
            <i className="fa-solid fa-arrow-left"></i>
         </button>
         <h3 className="flex-1 text-center font-bold text-lg text-slate-800">Select a Ride</h3>
         <div className="w-8"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="mb-4 px-2">
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                Distance: {distance.toFixed(1)} km
            </span>
        </div>
        {VEHICLES.map((v) => (
          <div 
            key={v.id}
            onClick={() => setSelectedId(v.id)}
            className={`flex items-center p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedId === v.id ? 'border-teal-600 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}
          >
            <div className="w-16 h-12 flex items-center justify-center mr-4 relative">
               <i className={`fa-solid ${v.icon} text-3xl text-slate-700`}></i>
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-900 text-lg leading-none">{v.name}</h4>
                    {/* UPDATED PRICE CALCULATION */}
                    <span className="font-bold text-slate-900 text-lg">₹{Math.floor(v.basePrice + (distance * v.perKmRate))}</span>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 max-w-[60%] truncate">{v.description} • <i className="fa-solid fa-user-group text-[10px]"></i> {v.id === 'BIKE' ? 1 : v.id === 'SUV' ? 6 : 4}</p>
                    <div className="text-right">
                        <p className="text-xs text-slate-900 font-bold">{v.eta} min away</p>
                        <p className="text-[10px] text-slate-500">Reach {getDropoffTime(v.eta)}</p>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 pb-8">
        
        {/* Payment Selector */}
        <div 
            onClick={() => setShowPaymentSheet(true)}
            className="flex items-center justify-between mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition active:scale-95"
        >
            <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm ${selectedMethodInfo.color}`}>
                      <i className={`fa-solid ${selectedMethodInfo.icon}`}></i>
                 </div>
                 <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Payment Method</span>
                      <span className="font-bold text-slate-700 leading-none">{selectedMethodInfo.name}</span>
                 </div>
            </div>
            <span className="text-xs text-teal-600 font-bold px-3 py-1 bg-teal-50 rounded-lg">Change</span>
        </div>

        <div className="flex items-center space-x-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
             <i className="fa-regular fa-clock text-slate-500"></i>
             <input 
                type="datetime-local" 
                className="bg-transparent w-full text-sm text-slate-700 outline-none font-medium"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                placeholder="Schedule for later"
             />
        </div>
        <button 
          disabled={!selectedId}
          onClick={handleBook}
          className={`w-full py-4 text-lg font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2
            ${selectedId ? 'bg-black text-white hover:bg-gray-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
          `}
        >
          <span>{scheduleTime ? 'Schedule ZenRide' : `Confirm ${selectedId ? VEHICLES.find(v => v.id === selectedId)?.name : 'Ride'}`}</span>
        </button>
      </div>
    </div>
  );
};

// ... ChatWindow and EmergencySheet remain unchanged ...

const ChatWindow: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  driverName: string;
}> = ({ isOpen, onClose, messages, onSendMessage, driverName }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-white z-50 rounded-t-3xl shadow-[0_-10px_50px_rgba(0,0,0,0.2)] flex flex-col animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-3xl">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                {driverName.charAt(0)}
            </div>
            <div>
                <h3 className="font-bold text-slate-800">{driverName}</h3>
                <p className="text-xs text-teal-600 font-medium">● Online</p>
            </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
            <i className="fa-solid fa-xmark text-slate-600"></i>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative text-sm shadow-sm ${
                    msg.sender === 'user' 
                    ? 'bg-slate-900 text-white rounded-br-none bubble-right' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none bubble-left'
                }`}
            >
                {msg.text}
                <span className={`text-[10px] block text-right mt-1 ${msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form 
            onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                    onSendMessage(input);
                    setInput('');
                }
            }}
            className="flex items-center gap-2"
        >
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message driver..."
                className="flex-1 bg-slate-100 border-0 px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition"
            />
            <button 
                type="submit"
                disabled={!input.trim()}
                className="w-12 h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <i className="fa-solid fa-paper-plane"></i>
            </button>
        </form>
      </div>
    </div>
  );
};

const EmergencySheet: React.FC<{ 
    onClose: () => void, 
    onCancelRide: () => void 
}> = ({ onClose, onCancelRide }) => {
  const handleCall = (number: string, name: string) => {
    alert(`Initiating call to ${name} (${number})...`);
  };

  const handleSOS = () => {
    alert("CRITICAL: SOS Message with Live Location sent to added Emergency Contacts via SMS/WhatsApp! Ride is being cancelled for your safety.");
    onCancelRide();
  };

  return (
    <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up space-y-6">
        <div className="text-center">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-red-600"></i>
             </div>
             <h2 className="text-2xl font-bold text-slate-900">Emergency Assistance</h2>
             <p className="text-slate-500 text-sm mt-1">Select an option for immediate help</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleCall('100', 'Police Control Room')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-2xl transition group active:scale-95">
                <i className="fa-solid fa-building-shield text-2xl text-slate-700 group-hover:text-red-600 mb-2"></i>
                <span className="font-bold text-slate-700 group-hover:text-red-700">Police (100)</span>
            </button>
            <button onClick={() => handleCall('108', 'Ambulance')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-2xl transition group active:scale-95">
                <i className="fa-solid fa-truck-medical text-2xl text-slate-700 group-hover:text-red-600 mb-2"></i>
                <span className="font-bold text-slate-700 group-hover:text-red-700">Ambulance</span>
            </button>
             <button onClick={() => handleCall('101', 'Fire Station')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-2xl transition group active:scale-95">
                <i className="fa-solid fa-fire-extinguisher text-2xl text-slate-700 group-hover:text-red-600 mb-2"></i>
                <span className="font-bold text-slate-700 group-hover:text-red-700">Fire (101)</span>
            </button>
             <button onClick={handleSOS} className="flex flex-col items-center justify-center p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition shadow-lg shadow-red-200 active:scale-95">
                <i className="fa-solid fa-tower-broadcast text-2xl mb-2 animate-pulse"></i>
                <span className="font-bold">SOS Family</span>
            </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
             <button 
                onClick={() => {
                    if(window.confirm("Are you sure you want to cancel the ride?")) {
                        onCancelRide();
                    }
                }} 
                className="w-full py-3 mb-3 text-red-600 font-bold rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-ban"></i>
                Cancel Ride
            </button>
            <button onClick={onClose} className="w-full py-3 bg-slate-100 font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition">
                Close
            </button>
        </div>
      </div>
    </div>
  )
}

const LiveTracking: React.FC<{ 
  ride: RideDetails, 
  is3D: boolean,
  toggle3D: () => void,
  onRecenter: () => void, // NEW PROP
  onCancelRide: () => void,
  onFinishRide: () => void,
  tripStatus: 'arriving' | 'boarding' | 'trip' | 'completed'
}> = ({ ride, is3D, toggle3D, onRecenter, onCancelRide, onFinishRide, tripStatus }) => {
  const [statusText, setStatusText] = useState("Connecting...");
  const [geminiFact, setGeminiFact] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ... useEffect for statusText and geminiFact (unchanged) ...
  useEffect(() => {
    // Sync UI text with Trip Status
    if (tripStatus === 'arriving') {
        setStatusText("Driver on the way");
        if (ride.driver && messages.length === 0) {
            getDriverMessage(ride.driver.name).then(text => {
                setMessages([{
                    id: 'init-1',
                    sender: 'driver',
                    text: text,
                    timestamp: new Date()
                }]);
            });
        }
    } else if (tripStatus === 'boarding') {
        setStatusText("Driver Arrived at Pickup");
    } else if (tripStatus === 'trip') {
        setStatusText("Heading to Destination");
    } else if (tripStatus === 'completed') {
        setStatusText("Arrived at Destination");
    }

    if (!geminiFact && ride.pickup && ride.dropoff) {
        getRouteInsights(ride.pickup.address, ride.dropoff.address).then(setGeminiFact);
    }
  }, [tripStatus, ride.driver]);
  
  // ... handleSendMessage (unchanged) ...
   const handleSendMessage = async (text: string) => {
      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          text,
          timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(async () => {
          if (ride.driver) {
              const replyText = await getChatResponse(text, ride.driver.name);
              const driverMsg: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  sender: 'driver',
                  text: replyText,
                  timestamp: new Date()
              };
              setMessages(prev => [...prev, driverMsg]);
          }
      }, 1500);
  };

  const selectedPaymentInfo = PAYMENT_METHODS.find(m => m.id === ride.paymentMethod);

  return (
    <>
    {isEmergencyOpen && <EmergencySheet onClose={() => setIsEmergencyOpen(false)} onCancelRide={onCancelRide} />}
    
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end z-30">
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-auto bg-gradient-to-b from-white via-white/80 to-transparent pb-12">
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between animate-slide-up">
           <div>
               <p className="text-xs text-teal-600 font-bold tracking-wider uppercase mb-1">Status</p>
               <h2 className="text-xl font-bold text-slate-900">{statusText}</h2>
           </div>
           <div className="flex gap-2">
             <button 
                onClick={onRecenter}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm transition active:scale-95 hover:bg-slate-200"
                title="Recenter Map"
             >
                <i className="fa-solid fa-crosshairs text-lg"></i>
             </button>
             <button 
               onClick={toggle3D}
               className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition active:scale-95 ${is3D ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
             >
               <i className="fa-solid fa-cube text-lg"></i>
             </button>
           </div>
        </div>
        {geminiFact && (
             <div className="mt-3 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl text-xs flex items-center gap-3 animate-slide-up shadow-lg mx-1">
                <i className="fa-solid fa-wand-magic-sparkles text-yellow-400"></i>
                <span className="font-medium">{geminiFact}</span>
             </div>
        )}
      </div>

      {/* Driver & Controls */}
      <div className={`bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.15)] pointer-events-auto p-6 space-y-6 transition-transform duration-500 ${isChatOpen ? 'translate-y-full' : 'translate-y-0'}`}>
         {/* Driver Card */}
         <div className="flex items-center space-x-4">
            {/* ... Driver Card Content (unchanged) ... */}
            <div className="relative">
                <img src={ride.driver?.photoUrl} alt="Driver" className="w-16 h-16 rounded-full border-4 border-slate-50 shadow-sm object-cover" />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-teal-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-xl">{ride.driver?.name}</h3>
                <div className="flex items-center gap-2">
                    <p className="text-slate-500 text-sm font-medium">{ride.vehicle?.name}</p>
                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">{ride.driver?.vehicleNumber}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-1">
                        {selectedPaymentInfo?.name}
                    </span>
                    <span className="text-xs font-bold">₹{ride.price}</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setIsChatOpen(true)}
                    className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition relative"
                >
                    <i className="fa-solid fa-comment-dots text-lg"></i>
                    {messages.length > 0 && messages[messages.length-1].sender === 'driver' && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>
                <button className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition">
                    <i className="fa-solid fa-phone text-lg"></i>
                </button>
            </div>
         </div>
         
         {/* Simple Progress Visualization */}
         <div className="relative pt-2">
             <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
                 <div style={{ width: tripStatus === 'arriving' ? '30%' : tripStatus === 'boarding' ? '50%' : tripStatus === 'completed' ? '100%' : '80%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-900 transition-all duration-1000"></div>
             </div>
             <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Pickup</span>
                <span>Dropoff</span>
             </div>
         </div>

         {/* Action Button */}
         {tripStatus === 'completed' ? (
             <button 
                onClick={onFinishRide}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition active:scale-95"
            >
                Rate & Complete Ride
            </button>
         ) : (
            <div className="space-y-3">
                <button 
                    onClick={() => setIsEmergencyOpen(true)}
                    className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-100 flex items-center justify-center space-x-3 transition active:scale-95"
                >
                    <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center">
                        <i className="fa-solid fa-shield text-xs"></i>
                    </div>
                    <span>Emergency Safety Assistance</span>
                </button>
                
                <button 
                    onClick={() => {
                        if(window.confirm("Are you sure you want to cancel your ride?")) {
                            onCancelRide();
                        }
                    }}
                    className="w-full py-3 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl transition"
                >
                    Cancel Ride
                </button>
            </div>
         )}
      </div>
    </div>
    
    {/* Chat Overlay */}
    <ChatWindow 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        driverName={ride.driver?.name || "Driver"}
    />
    </>
  );
};

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.LOGIN);
  const [rideDetails, setRideDetails] = useState<RideDetails>({
    pickup: { lat: 0, lng: 0, address: '' }, 
    dropoff: { lat: 0, lng: 0, address: '' },
    vehicle: null,
    scheduledTime: null,
    price: 0,
    paymentMethod: 'UPI'
  });
  const [rideDistance, setRideDistance] = useState(0);
  const [is3DMode, setIs3DMode] = useState(false);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [tripStatus, setTripStatus] = useState<'arriving' | 'boarding' | 'trip' | 'completed'>('arriving');
  const [history, setHistory] = useState<RideHistoryItem[]>(MOCK_HISTORY);
  const [recenterKey, setRecenterKey] = useState(0); // NEW State for map control
  
  const animationRef = useRef<number>(0);

  // ... Animation Logic (unchanged) ...
  useEffect(() => {
    // Only run animation in TRACKING mode
    if (step !== AppStep.TRACKING || !rideDetails.pickup || !rideDetails.dropoff) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
    }

    const startLoc = { 
        lat: rideDetails.pickup.lat - 0.006, 
        lng: rideDetails.pickup.lng - 0.006 
    }; // Mock driver start
    
    const pickupLoc = rideDetails.pickup;
    const dropoffLoc = rideDetails.dropoff;

    let startTime = performance.now();
    const arrivalDuration = 8000; // 8 seconds to arrive
    const boardingDuration = 3000; // 3 seconds wait
    const tripDuration = 15000; // 15 seconds trip

    const animate = (time: number) => {
        const elapsed = time - startTime;

        // Phase 1: Driver -> Pickup
        if (elapsed < arrivalDuration) {
            setTripStatus('arriving');
            const t = elapsed / arrivalDuration;
            // Lerp
            setDriverLocation({
                lat: startLoc.lat + (pickupLoc.lat - startLoc.lat) * t,
                lng: startLoc.lng + (pickupLoc.lng - startLoc.lng) * t,
                address: ''
            });
            animationRef.current = requestAnimationFrame(animate);
        } 
        // Phase 2: Boarding (Wait at Pickup)
        else if (elapsed < arrivalDuration + boardingDuration) {
             setTripStatus('boarding');
             setDriverLocation(pickupLoc);
             animationRef.current = requestAnimationFrame(animate);
        } 
        // Phase 3: Pickup -> Dropoff
        else if (elapsed < arrivalDuration + boardingDuration + tripDuration) {
             setTripStatus('trip');
             const tripElapsed = elapsed - (arrivalDuration + boardingDuration);
             const t = tripElapsed / tripDuration;
             setDriverLocation({
                lat: pickupLoc.lat + (dropoffLoc.lat - pickupLoc.lat) * t,
                lng: pickupLoc.lng + (dropoffLoc.lng - pickupLoc.lng) * t,
                address: ''
            });
            animationRef.current = requestAnimationFrame(animate);
        } 
        // End
        else {
             setDriverLocation(dropoffLoc);
             setTripStatus('completed');
             return;
        }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [step, rideDetails.pickup, rideDetails.dropoff]);


  const handleLogin = () => setStep(AppStep.LOCATION_SELECT);
  
  const handleLocationConfirm = (pickup: Location, dropoff: Location) => {
    const dist = getDistanceFromLatLonInKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    setRideDistance(dist);
    setRideDetails(prev => ({ ...prev, pickup, dropoff }));
    setStep(AppStep.VEHICLE_SELECT);
  };

  const handleVehicleSelect = (vehicle: VehicleOption, scheduledTime: Date | null, paymentMethod: PaymentMethod) => {
    setRideDetails(prev => ({ 
        ...prev, 
        vehicle, 
        scheduledTime, 
        // Updated price logic using perKmRate
        price: Math.floor(vehicle.basePrice + (rideDistance * vehicle.perKmRate)),
        paymentMethod: paymentMethod,
        driver: MOCK_DRIVER 
    }));
    setStep(AppStep.BOOKING);
    // Simulation finding driver
    setTimeout(() => {
        setStep(AppStep.TRACKING);
        setIs3DMode(true);
        setRecenterKey(prev => prev + 1); // Force center on start
    }, 3000);
  };

  const handleCancelRide = () => {
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
    }
    
    // Add to History as Cancelled
    if (step === AppStep.TRACKING && rideDetails.vehicle) {
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            pickup: rideDetails.pickup.address,
            dropoff: rideDetails.dropoff.address,
            vehicle: rideDetails.vehicle!.name,
            price: rideDetails.price,
            paymentMethod: rideDetails.paymentMethod,
            status: 'CANCELLED'
        }]);
    }

    resetApp();
  };

  const handleFinishRide = () => {
    // Add to History as Completed
    setHistory(prev => [...prev, {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        pickup: rideDetails.pickup.address,
        dropoff: rideDetails.dropoff.address,
        vehicle: rideDetails.vehicle!.name,
        price: rideDetails.price,
        paymentMethod: rideDetails.paymentMethod,
        status: 'COMPLETED'
    }]);
    
    resetApp();
  };

  const resetApp = () => {
    setStep(AppStep.LOCATION_SELECT);
    setDriverLocation(null);
    setRideDetails({
        pickup: { lat: 0, lng: 0, address: '' }, 
        dropoff: { lat: 0, lng: 0, address: '' },
        vehicle: null,
        scheduledTime: null,
        price: 0,
        paymentMethod: 'UPI'
    });
    setRideDistance(0);
    setIs3DMode(false);
    setTripStatus('arriving');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50 font-sans">
      
      {/* Map Background Layer */}
      {step !== AppStep.LOGIN && (
        <MapBackground 
          pickup={step !== AppStep.LOCATION_SELECT ? rideDetails.pickup : null}
          dropoff={step !== AppStep.LOCATION_SELECT ? rideDetails.dropoff : null}
          is3D={is3DMode}
          driverLocation={step === AppStep.TRACKING ? driverLocation : null}
          recenterKey={recenterKey}
        />
      )}

      {/* UI Layers */}
      
      {step === AppStep.LOGIN && <LoginScreen onLogin={handleLogin} />}

      {step === AppStep.LOCATION_SELECT && (
        <>
            {/* History Button */}
            <button 
                onClick={() => setStep(AppStep.HISTORY)}
                className="absolute top-4 right-4 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
                <i className="fa-solid fa-clock-rotate-left text-lg"></i>
            </button>
            <LocationSearch onConfirm={handleLocationConfirm} />
        </>
      )}

      {step === AppStep.HISTORY && (
        <RideHistory history={history} onBack={() => setStep(AppStep.LOCATION_SELECT)} />
      )}

      {step === AppStep.VEHICLE_SELECT && (
        <VehicleSelection 
            distance={rideDistance} 
            onSelect={handleVehicleSelect} 
            onBack={() => setStep(AppStep.LOCATION_SELECT)} 
        />
      )}

      {step === AppStep.BOOKING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl animate-fade-in">
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                <div className="absolute w-full h-full pulse-ring"></div>
                <div className="relative w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-xl z-10">
                    <i className="fa-solid fa-car-side text-white text-2xl"></i>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Connecting nearby drivers...</h2>
            <p className="text-slate-500 font-medium">Finding the best {rideDetails.vehicle?.name} for you</p>
        </div>
      )}

      {step === AppStep.TRACKING && (
        <LiveTracking 
            ride={rideDetails} 
            is3D={is3DMode}
            toggle3D={() => setIs3DMode(!is3DMode)}
            onRecenter={() => setRecenterKey(k => k + 1)}
            onCancelRide={handleCancelRide}
            onFinishRide={handleFinishRide}
            tripStatus={tripStatus}
        />
      )}
    </div>
  );
}
