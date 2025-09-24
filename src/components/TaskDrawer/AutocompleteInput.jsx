import React, { useState, useEffect, useRef } from 'react';
import './AutocompleteInput.css';

/**
 * AutocompleteInput component - Search input with dropdown suggestions
 * Supports keyboard navigation and click selection
 */
const AutocompleteInput = ({
  id,
  value,
  displayValue,
  options = [],
  onSelect,
  placeholder = 'Search...',
  getOptionLabel = (option) => option.label,
  getOptionValue = (option) => option.value,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(displayValue || '');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Update search term when displayValue changes
  useEffect(() => {
    setSearchTerm(displayValue || '');
  }, [displayValue]);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter(option => 
      getOptionLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
    setHighlightedIndex(-1);
  }, [searchTerm, options, getOptionLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // If search term is empty, clear selection
    if (!newValue.trim()) {
      onSelect?.(null);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    const optionLabel = getOptionLabel(option);
    setSearchTerm(optionLabel);
    setIsOpen(false);
    onSelect?.(option);
    inputRef.current?.blur();
  };

  // Handle clear selection
  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    onSelect?.(null);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      
      default:
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [highlightedIndex]);

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div ref={containerRef} className={`autocomplete-container ${className}`}>
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="autocomplete-input"
          autoComplete="off"
        />
        
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
        
        <div className="dropdown-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="autocomplete-dropdown">
          <ul ref={listRef} className="autocomplete-list">
            {filteredOptions.length === 0 ? (
              <li className="autocomplete-option no-results">
                {searchTerm ? 'No se encontraron resultados' : 'No hay opciones disponibles'}
              </li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={getOptionValue(option)}
                  className={`autocomplete-option ${
                    index === highlightedIndex ? 'highlighted' : ''
                  } ${getOptionValue(option) === value ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="option-content">
                    <div className="option-avatar">
                      {getUserInitials(getOptionLabel(option))}
                    </div>
                    <div className="option-info">
                      <div className="option-name">{getOptionLabel(option)}</div>
                      {option.role && (
                        <div className="option-role">{option.role}</div>
                      )}
                    </div>
                  </div>
                  {getOptionValue(option) === value && (
                    <div className="option-check">✓</div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
