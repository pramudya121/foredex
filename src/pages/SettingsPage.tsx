import { SettingsPanel } from '@/components/SettingsPanel';

export default function SettingsPage() {
  return (
    <main className="flex-1 container py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <SettingsPanel />
      </div>
    </main>
  );
}
