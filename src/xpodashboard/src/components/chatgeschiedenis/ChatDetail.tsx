'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type Message = {
  id: number;
  content: string;
  timestamp: string;
  isBot: boolean;
};

// Dit is tijdelijk, later halen we dit uit een API/database
const chatData = [
  { id: '00001', bedrijf: 'Howest', functie: 'Student', date: '04 Sep 2019', beurs: 'Flor', status: 'completed' },
  { id: '00002', bedrijf: 'Tapijtfirma', functie: 'Innovation functie', date: '28 May 2019', beurs: 'Flor', status: 'rejected' },
  { id: '00003', bedrijf: 'Darrell Caldwell', functie: '8587 Frida Ports', date: '23 Nov 2019', beurs: 'Abiss', status: 'rejected' },
  { id: '00004', bedrijf: 'Gilbert Johnston', functie: '768 Destiny Lake Suite 600', date: '05 Feb 2019', beurs: 'Abiss', status: 'completed' },
  { id: '00005', bedrijf: 'Alan Cain', functie: '042 Mylene Throughway', date: '29 Jul 2019', beurs: 'Artisan', status: 'rejected' },
  { id: '00006', bedrijf: 'Alfred Murray', functie: '543 Weimann Mountain', date: '15 Aug 2019', beurs: 'Artisan', status: 'completed' },
  { id: '00007', bedrijf: 'Maggie Sullivan', functie: 'New Scottieberg', date: '21 Dec 2019', beurs: 'Artisan', status: 'completed' },
  { id: '00008', bedrijf: 'Rosie Todd', functie: 'New Jon', date: '30 Apr 2019', beurs: 'Artisan', status: 'rejected' },
  { id: '00009', bedrijf: 'Dollie Hines', functie: '124 Lyla Forge Suite 975', date: '09 Jan 2019', beurs: 'Artisan', status: 'completed' },
];

export default function ChatDetail() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  
  // Zoek de juiste chat data
  const currentChat = chatData.find(chat => chat.id === chatId) || { bedrijf: 'Onbekend', functie: 'Onbekend' };

  const messages: Message[] = [
    {
      id: 1,
      content: "Het is een vaststaand feit dat een lezer, tijdens het bekijken van de layout van een pagina, afgeleid zal worden door de tekstuele inhoud. Het punt van het gebruik van Lorem Ipsum is dat het een min of meer normale verdeling van letters bevat.",
      timestamp: "6:30 pm",
      isBot: false
    },
    {
      id: 2,
      content: "Er zijn vele variaties van passages van Lorem Ipsum beschikbaar, maar het merendeel heeft te lijden gehad van wijzigingen in een of andere vorm, door ingevoegde humor.",
      timestamp: "6:34 pm",
      isBot: true
    },
    {
      id: 3,
      content: "Het punt van het gebruik van Lorem Ipsum is dat het een min of meer normale verdeling van letters bevat, in tegenstelling tot 'Hier uw tekst, hier uw tekst' wat het tot min of meer leesbaar Nederlands maakt. Veel desktop publishing pakketten en web pagina editors gebruiken tegenwoordig Lorem Ipsum als hun standaard model tekst.",
      timestamp: "6:38 pm",
      isBot: false
    }
  ];

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-150 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <button 
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="ml-6">
            <h1 className="text-lg font-semibold text-black">{currentChat.bedrijf}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">{currentChat.functie}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isBot ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-lg p-4 ${
                message.isBot 
                  ? 'bg-red-10 text-white' 
                  : 'bg-black/3 text-black'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-2 ${message.isBot ? 'text-white/80' : 'text-neutral-500'}`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 