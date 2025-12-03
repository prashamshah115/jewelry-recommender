import React, { useState } from 'react'
import SearchBar from './components/SearchBar'
import ImageUpload from './components/ImageUpload'
import Filters from './components/Filters'
import ResultsGrid from './components/ResultsGrid'
import { searchJewelry } from './api/client'
import './App.css'

function App() {
  const [queryText, setQueryText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [dataset, setDataset] = useState('cartier')
  const [filters, setFilters] = useState({})
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!queryText && !imageFile) {
      setError('Please provide either text query or image')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await searchJewelry({
        queryText: queryText || null,
        image: imageFile,
        dataset,
        topK: 20,
        ...filters
      })
      setResults(response.results || [])
    } catch (err) {
      setError(err.message || 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>💎 Jewelry Retrieval System</h1>
        <p>Multimodal search for rings and diamonds using SigLIP</p>
      </header>

      <div className="app-container">
        <div className="search-section">
          <div className="search-inputs">
            <SearchBar
              value={queryText}
              onChange={setQueryText}
              onSearch={handleSearch}
            />
            <ImageUpload
              file={imageFile}
              onChange={setImageFile}
            />
          </div>

          <Filters
            dataset={dataset}
            onDatasetChange={setDataset}
            filters={filters}
            onFiltersChange={setFilters}
          />

          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <ResultsGrid
          results={results}
          dataset={dataset}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default App




