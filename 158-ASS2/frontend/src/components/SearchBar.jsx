import React from 'react'

function SearchBar({ value, onChange, onSearch }) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch()
    }
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Enter your search query (e.g., 'hidden halo yellow gold thin band modern')"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className="search-input"
      />
    </div>
  )
}

export default SearchBar




