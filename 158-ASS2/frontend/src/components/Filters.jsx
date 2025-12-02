import React from 'react'

function Filters({ dataset, onDatasetChange, filters, onFiltersChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="filters">
      <h3>Filters</h3>

      <div className="filter-group">
        <label>Dataset:</label>
        <select
          value={dataset}
          onChange={(e) => onDatasetChange(e.target.value)}
          className="filter-select"
        >
          <option value="cartier">Cartier Rings</option>
          <option value="diamonds">Diamonds</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Price Range:</label>
        <div className="price-range">
          <input
            type="number"
            placeholder="Min"
            value={filters.price_min || ''}
            onChange={(e) => updateFilter('price_min', e.target.value ? parseFloat(e.target.value) : null)}
            className="filter-input"
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.price_max || ''}
            onChange={(e) => updateFilter('price_max', e.target.value ? parseFloat(e.target.value) : null)}
            className="filter-input"
          />
        </div>
      </div>

      {dataset === 'cartier' && (
        <div className="filter-group">
          <label>Metal Type:</label>
          <select
            value={filters.metal || ''}
            onChange={(e) => updateFilter('metal', e.target.value || null)}
            className="filter-select"
          >
            <option value="">All</option>
            <option value="yellow gold">Yellow Gold</option>
            <option value="white gold">White Gold</option>
            <option value="pink gold">Pink Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
      )}

      {dataset === 'diamonds' && (
        <>
          <div className="filter-group">
            <label>Shape:</label>
            <select
              value={filters.shape || ''}
              onChange={(e) => updateFilter('shape', e.target.value || null)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="Round">Round</option>
              <option value="Oval">Oval</option>
              <option value="Pear">Pear</option>
              <option value="Marquise">Marquise</option>
              <option value="Princess">Princess</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Color:</label>
            <select
              value={filters.color || ''}
              onChange={(e) => updateFilter('color', e.target.value || null)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="F">F</option>
              <option value="G">G</option>
              <option value="H">H</option>
              <option value="I">I</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Clarity:</label>
            <select
              value={filters.clarity || ''}
              onChange={(e) => updateFilter('clarity', e.target.value || null)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="IF">IF</option>
              <option value="VVS1">VVS1</option>
              <option value="VVS2">VVS2</option>
              <option value="VS1">VS1</option>
              <option value="VS2">VS2</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Carat Range:</label>
            <div className="price-range">
              <input
                type="number"
                step="0.01"
                placeholder="Min"
                value={filters.carat_min || ''}
                onChange={(e) => updateFilter('carat_min', e.target.value ? parseFloat(e.target.value) : null)}
                className="filter-input"
              />
              <span>to</span>
              <input
                type="number"
                step="0.01"
                placeholder="Max"
                value={filters.carat_max || ''}
                onChange={(e) => updateFilter('carat_max', e.target.value ? parseFloat(e.target.value) : null)}
                className="filter-input"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Filters



