import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface SearchableManufacturerSelectProps {
  manufacturers: string[];
  value: string;
  onChange: (manufacturer: string) => void;
  placeholder?: string;
  required?: boolean;
}

const SearchableManufacturerSelect: React.FC<SearchableManufacturerSelectProps> = ({
  manufacturers,
  value,
  onChange,
  placeholder = '-- Choose Manufacturer --',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredManufacturers = manufacturers.filter(m => {
    if (!searchTerm.trim()) return true;
    return m.toLowerCase().includes(searchTerm.toLowerCase().trim());
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input to support standard form required validation */}
      <input
        type="text"
        value={value}
        required={required}
        onChange={() => {}}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Selected Box / Toggle Button */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #cbd5e1',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          boxSizing: 'border-box',
          minHeight: '42px'
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? (
            <span style={{ color: '#1e293b', fontWeight: 500 }}>{value}</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem' }}>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown size={18} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 100,
            overflow: 'hidden'
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <Search size={16} color="#64748b" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              type="text"
              autoFocus
              placeholder="Search manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.875rem'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Manufacturer List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredManufacturers.length === 0 ? (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center' }}>
                No matching manufacturers found
              </div>
            ) : (
              filteredManufacturers.map((m, idx) => {
                const isSelected = m.toLowerCase() === value.toLowerCase();

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(m);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      padding: '0.625rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f1f5f9' : 'transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.875rem', color: '#1e293b' }}>
                      {m}
                    </div>

                    {isSelected && <Check size={16} color="#3b82f6" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableManufacturerSelect;
