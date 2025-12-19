import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Form, FormGroup, Label, Input, Textarea, Select, Button } from '../../../components/Form';

const ChangeForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    serverName: '', application: '', type: 'Update', status: 'success',
    title: '', description: '', parameters: '', date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-800">Log New Change</h3>
        <button onClick={onCancel}><XCircle className="text-slate-400 hover:text-slate-600" /></button>
      </div>
      
      <Form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label htmlFor="serverName">Server Name</Label>
            <Input required type="text" id="serverName" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} placeholder="e.g. Web-Prod-01" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="application">Application (Optional)</Label>
            <Input type="text" id="application" value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} placeholder="e.g. Nginx" />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label htmlFor="type">Change Type</Label>
            <Select id="type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option>Update</option><option>Patch</option><option>Config Change</option><option>Reboot</option><option>Deployment</option><option>Hardware</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="success">Success</option><option value="pending">Pending</option><option value="failed">Failed</option>
            </Select>
          </FormGroup>
        </div>

        <FormGroup>
          <Label htmlFor="title">Title / Summary</Label>
          <Input required type="text" id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Brief summary of change" />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Detailed Description</Label>
          <Textarea rows="3" id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Steps taken, reasons, etc." />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="parameters">Parameters Changed (Key:Value)</Label>
          <Textarea rows="2" id="parameters" value={formData.parameters} onChange={e => setFormData({...formData, parameters: e.target.value})} className="font-mono text-xs bg-slate-50" placeholder="e.g. worker_processes: 4; timeout: 30s" />
        </FormGroup>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
          <Button type="submit">Record Change</Button>
        </div>
      </Form>
    </div>
  );
};

export default ChangeForm;