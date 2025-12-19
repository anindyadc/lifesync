import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Form, FormGroup, Label, Input, Select, Button, Textarea } from '../../../components/Form';

const INVESTMENT_TYPES = ['NSC', 'FD', 'Mutual Fund', 'Stocks', 'Gold', 'Real Estate', 'Other'];
const INVESTMENT_HOLDERS = ['Self', 'Wife', 'Mother', 'Joint', 'Other'];

const InvestmentForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    holder: 'Self',
    type: 'FD',
    name: '',
    amount: '',
    maturityDate: '',
    details: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        holder: initialData.holder || 'Self',
        type: initialData.type || 'FD',
        name: initialData.name || '',
        amount: initialData.amount || '',
        maturityDate: initialData.maturityDate || '',
        details: initialData.details || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <h3 className="text-lg font-bold">{initialData ? 'Edit Investment' : 'New Investment'}</h3>
        <button onClick={onCancel}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1">
        <Form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
          <FormGroup>
            <Label htmlFor="holder">Investment Holder</Label>
            <Select 
              id="holder"
              value={formData.holder}
              onChange={e => setFormData({...formData, holder: e.target.value})}
            >
              {INVESTMENT_HOLDERS.map(holder => (
                <option key={holder} value={holder}>{holder}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="type">Investment Type</Label>
            <Select 
              id="type"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              {INVESTMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="name">Investment Name / Bank</Label>
            <Input 
              id="name"
              type="text" 
              placeholder="e.g. SBI Fixed Deposit, Post Office NSC" 
              required
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input 
              id="amount"
              type="number" 
              placeholder="e.g. 50000" 
              required
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: e.target.value})} 
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="maturityDate">Maturity Date</Label>
            <Input 
              id="maturityDate"
              type="date" 
              required
              value={formData.maturityDate} 
              onChange={e => setFormData({...formData, maturityDate: e.target.value})} 
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea 
              id="details"
              rows="3" 
              placeholder="e.g. FD number: 12345, NSC serial: A123456" 
              value={formData.details} 
              onChange={e => setFormData({...formData, details: e.target.value})} 
            />
          </FormGroup>
        </Form>
      </div>
      
      <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
        <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
        <Button type="submit" form="investment-form">Save Investment</Button>
      </div>
    </div>
  );
};

export default InvestmentForm;
