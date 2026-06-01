import React from 'react';
import type { ValidationError } from '../utils/validation';
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface ValidationAuditorProps {
  errors: ValidationError[];
  setActiveTab: (tab: string) => void;
}

export const ValidationAuditor: React.FC<ValidationAuditorProps> = ({
  errors,
  setActiveTab,
}) => {
  const sortedErrors = [...errors].sort((a, b) => {
    // Errors first, then warnings
    if (a.type === 'error' && b.type === 'warning') return -1;
    if (a.type === 'warning' && b.type === 'error') return 1;
    return a.tab.localeCompare(b.tab);
  });

  const getIcon = (type: 'error' | 'warning') => {
    if (type === 'error') {
      return <XCircle className="error-icon" size={16} />;
    }
    return <AlertTriangle className="warning-icon" size={16} />;
  };

  return (
    <div className="validation-auditor-container">
      <div className="auditor-header">
        <h3>Data Audit Log</h3>
        <span className={`badge ${errors.length > 0 ? 'badge-danger' : 'badge-success'}`}>
          {errors.length} {errors.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      <div className="auditor-list">
        {sortedErrors.length === 0 ? (
          <div className="auditor-empty">
            <CheckCircle2 className="success-icon" size={24} />
            <p>All checks passed! Your drillhole loggings are valid.</p>
          </div>
        ) : (
          sortedErrors.map((err, i) => (
            <div
              key={`${err.id}-${err.tab}-${i}`}
              className={`auditor-item ${err.type === 'error' ? 'item-error' : 'item-warning'}`}
              onClick={() => {
                // Map the validation tab to the screen tab
                let tabTarget: string = err.tab;
                if (err.tab === 'Geotech') tabTarget = 'TCR / RQD';
                setActiveTab(tabTarget);
              }}
            >
              <div className="item-icon">{getIcon(err.type)}</div>
              <div className="item-content">
                <span className="item-tab-label">{err.tab}</span>
                <p className="item-message">{err.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
