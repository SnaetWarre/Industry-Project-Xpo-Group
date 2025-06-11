import { Download, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { RegistrationClick } from '../../../types/api';

interface RegistrationTableProps {
  registrationClicks: RegistrationClick[];
}

export const RegistrationTable = ({ registrationClicks }: RegistrationTableProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl text-black">Registratie kliks</h2>
          <span className="text-black">{registrationClicks.length}</span>
        </div>
        <button className="inline-flex items-center gap-2 text-black border border-black px-4 py-2 hover:bg-red-10 hover:text-white hover:border-red-10 transition-all duration-300 cursor-pointer">
          <Download className="h-5 w-5" />
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white">
          <thead>
            <tr>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">#</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Bedrijfsnaam</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Functietitel</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Klikdatum</th>
              <th scope="col" className="py-4 px-6 text-left text-xs font-bold text-black uppercase">Beurs</th>
              <th scope="col" className="py-4 px-6 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {registrationClicks.map((click) => (
              <tr key={click.id} className="border-b border-neutral-150 hover:bg-gray-50">
                <td className="py-6 px-6 text-sm text-black">{click.id}</td>
                <td className="py-6 px-6 text-sm text-black">{click.companyName}</td>
                <td className="py-6 px-6 text-sm text-black">{click.jobTitle}</td>
                <td className="py-6 px-6 text-sm text-black">{click.clickDate}</td>
                <td className="py-6 px-6 text-sm text-black">{click.event}</td>
                <td className="py-6 px-6">
                  <Link
                    href={`/chatgeschiedenis/${click.id}`}
                    className="hover:bg-red-10/10 p-2 rounded-full transition-all duration-300 cursor-pointer inline-flex"
                  >
                    <ArrowUpRight className="h-4 w-4 text-black" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 