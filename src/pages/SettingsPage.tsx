import React, { useEffect, useState } from 'react';
import { useAuth, useTenancy } from '../contexts';
import { orgService } from '../services/orgService';
import { OrganizationSettings, Role, ROLE_PERMISSIONS } from '../types';
import { Settings, Shield, Layout, Save, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const { currentOrg } = useTenancy();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setSettings(currentOrg.settings);
    }
  }, [currentOrg]);

  const handleToggle = (module: keyof OrganizationSettings['modules']) => {
    if (!settings) return;
    setSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [module]: !settings.modules[module]
      }
    });
  };

  const saveSettings = async () => {
    if (!currentOrg || !settings) return;
    setSaving(true);
    try {
      await orgService.updateSettings(currentOrg.id, settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Organization Settings</h2>
          <p className="text-zinc-500 font-serif italic">Configure modules and permissions for your workspace.</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {success ? 'Saved!' : 'Save Changes'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold">
            <Layout className="w-5 h-5 text-orange-500" />
            <h3>Feature Modules</h3>
          </div>
          <p className="text-sm text-zinc-500">Enable or disable modules based on your business needs.</p>
        </div>
        
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(settings.modules).map(([key, enabled]) => (
            <button
              key={key}
              onClick={() => handleToggle(key as any)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                enabled 
                  ? 'bg-white border-orange-200 shadow-sm' 
                  : 'bg-zinc-50 border-zinc-200 opacity-60'
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-bold text-zinc-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{enabled ? 'Active' : 'Disabled'}</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-orange-500' : 'bg-zinc-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold">
            <Shield className="w-5 h-5 text-orange-500" />
            <h3>Role Permissions</h3>
          </div>
          <p className="text-sm text-zinc-500">View the default permissions for each role in your organization.</p>
        </div>
        
        <div className="md:col-span-2 space-y-4">
          {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => (
            <div key={role} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-zinc-900 capitalize">{role}</h4>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Default Role</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                {Object.entries(ROLE_PERMISSIONS[role]).map(([perm, allowed]) => (
                  <div key={perm} className="flex items-center gap-2">
                    {allowed ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-300" />}
                    <span className={`text-[10px] capitalize ${allowed ? 'text-zinc-600' : 'text-zinc-300'}`}>
                      {perm.replace(/([A-Z])/g, ' $1')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
