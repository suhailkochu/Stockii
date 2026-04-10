import React, { useEffect, useMemo, useState } from 'react';
import { useTenancy } from '../contexts';
import { orgService } from '../services/orgService';
import { OrganizationSettings, Role, ROLE_PERMISSIONS } from '../types';
import { Shield, Layout, Save, Check, X, Search, Coins } from 'lucide-react';
import { useNotifications } from '../notifications';
import { AppSelect } from '../components/AppSelect';

const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'SAR', label: 'Saudi Riyal' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
];

const prettify = (value: string) => value.replace(/([A-Z])/g, ' $1').trim();

export default function SettingsPage() {
  const { currentOrg } = useTenancy();
  const { success, error: notifyError } = useNotifications();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      setSettings({
        multiLocationEnabled: false,
        tableDisplayMode: 'table',
        ...currentOrg.settings,
      });
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
      success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      notifyError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredModules = useMemo(() => {
    if (!settings) return [];
    return Object.entries(settings.modules).filter(([key]) =>
      prettify(key).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [settings, searchTerm]);

  const filteredRoles = useMemo(() => {
    return (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((role) => {
      if (!searchTerm.trim()) return true;
      if (role.toLowerCase().includes(searchTerm.toLowerCase())) return true;
      return Object.keys(ROLE_PERMISSIONS[role]).some((permission) =>
        prettify(permission).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm]);

  if (!settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Organization Settings</h2>
          <p className="text-zinc-500 font-serif italic">Set your defaults and control what modules are active.</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </header>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search settings, modules, or permissions..."
            className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold">
            <Coins className="w-5 h-5 text-orange-500" />
            <h3>Business Defaults</h3>
          </div>
          <p className="text-sm text-zinc-500">Choose defaults used across invoices, sales, purchases, and reports.</p>
        </div>

        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Default Currency</label>
            <AppSelect
              value={settings.currency}
              onChange={(value) => setSettings({ ...settings, currency: value })}
              placeholder="Select Currency"
              searchable
              options={CURRENCY_OPTIONS.map((currency) => ({
                value: currency.code,
                label: `${currency.code} - ${currency.label}`,
                keywords: currency.label,
              }))}
              buttonClassName="py-3"
            />
            <p className="mt-2 text-xs text-zinc-500">This becomes the default currency shown throughout the app.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, taxEnabled: !settings.taxEnabled })}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 text-left cursor-pointer"
            >
              <div>
                <p className="text-sm font-bold text-zinc-900">Enable Tax</p>
                <p className="text-xs text-zinc-500">Use organization-wide tax in sales.</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.taxEnabled ? 'bg-orange-500' : 'bg-zinc-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, multiLocationEnabled: !settings.multiLocationEnabled })}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 text-left cursor-pointer"
            >
              <div>
                <p className="text-sm font-bold text-zinc-900">Multiple Locations</p>
                <p className="text-xs text-zinc-500">Show warehouse and destination selectors across inventory flows.</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.multiLocationEnabled ? 'bg-orange-500' : 'bg-zinc-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.multiLocationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <label className="block text-sm font-bold text-zinc-900 mb-2">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                disabled={!settings.taxEnabled}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-2 text-xs text-zinc-500">{settings.taxEnabled ? 'Applied to sales calculations.' : 'Enable tax to edit this rate.'}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-sm font-bold text-zinc-900 mb-2">Data Layout</p>
              <div className="flex gap-2 rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tableDisplayMode: 'table' })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    settings.tableDisplayMode === 'table'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tableDisplayMode: 'cards' })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    settings.tableDisplayMode === 'cards'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  Cards
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Choose whether data-heavy screens open as wide tables or stacked cards by default.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold">
            <Layout className="w-5 h-5 text-orange-500" />
            <h3>Feature Modules</h3>
          </div>
          <p className="text-sm text-zinc-500">Enable or disable modules based on your business needs.</p>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredModules.length === 0 ? (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              No modules matched your search.
            </div>
          ) : (
            filteredModules.map(([key, enabled]) => (
              <button
                key={key}
                onClick={() => handleToggle(key as keyof OrganizationSettings['modules'])}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  enabled
                    ? 'bg-white border-orange-200 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 opacity-60'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-900 capitalize">{prettify(key)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{enabled ? 'Active' : 'Disabled'}</p>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-orange-500' : 'bg-zinc-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            ))
          )}
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
          {filteredRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              No roles or permissions matched your search.
            </div>
          ) : (
            filteredRoles.map((role) => (
              <div key={role} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-zinc-900 capitalize">{role}</h4>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Default Role</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                  {Object.entries(ROLE_PERMISSIONS[role])
                    .filter(([permission]) =>
                      !searchTerm.trim() || prettify(permission).toLowerCase().includes(searchTerm.toLowerCase()) || role.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(([permission, allowed]) => (
                      <div key={permission} className="flex items-center gap-2">
                        {allowed ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-300" />}
                        <span className={`text-[10px] capitalize ${allowed ? 'text-zinc-600' : 'text-zinc-300'}`}>
                          {prettify(permission)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
