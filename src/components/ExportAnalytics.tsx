import { useState, forwardRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PoolData {
  name: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
}

interface ExportAnalyticsProps {
  pools?: PoolData[];
  volumeData?: { date: string; volume: number }[];
  tvlData?: { date: string; tvl: number }[];
}

const ExportAnalyticsInner = forwardRef<HTMLDivElement, ExportAnalyticsProps>(
  function ExportAnalyticsInner({ pools = [], volumeData = [], tvlData = [] }, ref) {
  const [exporting, setExporting] = useState(false);

  const formatDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPoolsCSV = () => {
    setExporting(true);
    try {
      const headers = ['Pool Name', 'TVL (USD)', '24h Volume (USD)', '24h Fees (USD)', 'APR (%)'];
      const rows = pools.map(pool => [
        pool.name,
        pool.tvl.toFixed(2),
        pool.volume24h.toFixed(2),
        pool.fees24h.toFixed(2),
        pool.apr.toFixed(2),
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      downloadCSV(csvContent, `foredex-pools-${formatDate()}.csv`);
      toast.success('Pools data exported successfully!');
    } catch (error) {
      toast.error('Failed to export pools data');
    } finally {
      setExporting(false);
    }
  };

  const exportVolumeCSV = () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Volume (USD)'];
      const rows = volumeData.map(item => [item.date, item.volume.toFixed(2)]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      downloadCSV(csvContent, `foredex-volume-${formatDate()}.csv`);
      toast.success('Volume data exported successfully!');
    } catch (error) {
      toast.error('Failed to export volume data');
    } finally {
      setExporting(false);
    }
  };

  const exportTVLCSV = () => {
    setExporting(true);
    try {
      const headers = ['Date', 'TVL (USD)'];
      const rows = tvlData.map(item => [item.date, item.tvl.toFixed(2)]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      downloadCSV(csvContent, `foredex-tvl-${formatDate()}.csv`);
      toast.success('TVL data exported successfully!');
    } catch (error) {
      toast.error('Failed to export TVL data');
    } finally {
      setExporting(false);
    }
  };

  const exportAllCSV = () => {
    setExporting(true);
    try {
      // Export all data in one file
      let csvContent = '=== FOREDEX Analytics Report ===\n';
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Pools section
      csvContent += '--- Pool Statistics ---\n';
      csvContent += 'Pool Name,TVL (USD),24h Volume (USD),24h Fees (USD),APR (%)\n';
      pools.forEach(pool => {
        csvContent += `${pool.name},${pool.tvl.toFixed(2)},${pool.volume24h.toFixed(2)},${pool.fees24h.toFixed(2)},${pool.apr.toFixed(2)}\n`;
      });
      
      csvContent += '\n--- Volume History ---\n';
      csvContent += 'Date,Volume (USD)\n';
      volumeData.forEach(item => {
        csvContent += `${item.date},${item.volume.toFixed(2)}\n`;
      });
      
      csvContent += '\n--- TVL History ---\n';
      csvContent += 'Date,TVL (USD)\n';
      tvlData.forEach(item => {
        csvContent += `${item.date},${item.tvl.toFixed(2)}\n`;
      });
      
      downloadCSV(csvContent, `foredex-full-report-${formatDate()}.csv`);
      toast.success('Full analytics report exported!');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting} className="gap-2">
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAllCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Full Report (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPoolsCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Pools Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportVolumeCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Volume History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTVLCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          TVL History
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export const ExportAnalytics = memo(ExportAnalyticsInner);
