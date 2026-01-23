import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getStoredTransactions, Transaction } from './TransactionHistory';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExportTransactionHistory() {
  const { address, isConnected } = useWeb3();
  const [exporting, setExporting] = useState(false);

  const getTransactions = (): Transaction[] => {
    if (!address) return [];
    return getStoredTransactions(address);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const transactions = getTransactions();
      if (transactions.length === 0) {
        toast.error('No transactions to export');
        return;
      }

      // CSV Headers
      const headers = ['Date', 'Type', 'Description', 'Status', 'Transaction Hash'];
      
      // CSV Rows
      const rows = transactions.map(tx => [
        formatDate(tx.timestamp),
        tx.type.toUpperCase().replace('_', ' '),
        tx.description,
        tx.status.toUpperCase(),
        tx.hash,
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `foredex_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${transactions.length} transactions to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const transactions = getTransactions();
      if (transactions.length === 0) {
        toast.error('No transactions to export');
        return;
      }

      // Format transactions for export
      const exportData = {
        exportDate: new Date().toISOString(),
        wallet: address,
        totalTransactions: transactions.length,
        transactions: transactions.map(tx => ({
          ...tx,
          formattedDate: formatDate(tx.timestamp),
        })),
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `foredex_transactions_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${transactions.length} transactions to JSON`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const generatePDFContent = () => {
    const transactions = getTransactions();
    if (transactions.length === 0) return null;

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FOREDEX Transaction History</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
          .meta { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #8b5cf6; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-confirmed { color: #22c55e; font-weight: bold; }
          .status-pending { color: #f59e0b; font-weight: bold; }
          .status-failed { color: #ef4444; font-weight: bold; }
          .hash { font-family: monospace; font-size: 12px; color: #666; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🐺 FOREDEX Transaction History</h1>
        <div class="meta">
          <p><strong>Wallet:</strong> ${address}</p>
          <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Transactions:</strong> ${transactions.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th>Transaction Hash</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => `
              <tr>
                <td>${formatDate(tx.timestamp)}</td>
                <td>${tx.type.toUpperCase().replace('_', ' ')}</td>
                <td>${tx.description}</td>
                <td class="status-${tx.status}">${tx.status.toUpperCase()}</td>
                <td class="hash">${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated by FOREDEX - Decentralized Exchange on Nexus Testnet</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const htmlContent = generatePDFContent();
      if (!htmlContent) {
        toast.error('No transactions to export');
        return;
      }

      // Open print dialog for PDF generation
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast.success('PDF export opened - use print dialog to save');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  if (!isConnected) return null;

  const transactions = getTransactions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={exporting || transactions.length === 0}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
