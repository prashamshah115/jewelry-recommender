import React from 'react'

function ResultsGrid({ results, dataset, loading }) {
  if (loading) {
    return (
      <div className="results-loading">
        <p>Searching...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="results-empty">
        <p>No results found. Try a different search query.</p>
      </div>
    )
  }

  return (
    <div className="results-section">
      <h2>Results ({results.length})</h2>
      <div className="results-grid">
        {results.map((result, idx) => (
          <ResultCard
            key={result.id || idx}
            result={result}
            dataset={dataset}
          />
        ))}
      </div>
    </div>
  )
}

function ResultCard({ result, dataset }) {
  const metadata = result.metadata || {}
  const score = result.similarity_score || 0

  return (
    <div className="result-card">
      {dataset === 'cartier' && (
        <>
          <div className="card-header">
            <h3>{metadata.title || 'Unknown'}</h3>
            <span className="similarity-score">
              {(score * 100).toFixed(1)}% match
            </span>
          </div>
          
          {metadata.price && (
            <div className="card-price">
              ${metadata.price.toLocaleString()}
            </div>
          )}

          <div className="card-details">
            {metadata.metals && metadata.metals.length > 0 && (
              <div className="card-tag">
                <strong>Metal:</strong> {metadata.metals.join(', ')}
              </div>
            )}
            
            {metadata.gemstones && metadata.gemstones.length > 0 && (
              <div className="card-tag">
                <strong>Gemstones:</strong> {metadata.gemstones.join(', ')}
              </div>
            )}
            
            {metadata.band_width_mm && (
              <div className="card-tag">
                <strong>Band width:</strong> {metadata.band_width_mm}mm
              </div>
            )}

            {metadata.description && (
              <p className="card-description">
                {metadata.description.substring(0, 150)}
                {metadata.description.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        </>
      )}

      {dataset === 'diamonds' && (
        <>
          <div className="card-header">
            <h3>
              {metadata.carat_weight ? `${metadata.carat_weight} carat` : ''}{' '}
              {metadata.shape || metadata.cut || 'Diamond'}
            </h3>
            <span className="similarity-score">
              {(score * 100).toFixed(1)}% match
            </span>
          </div>
          
          {metadata.price && metadata.price > 0 && (
            <div className="card-price">
              ${metadata.price.toLocaleString()}
            </div>
          )}

          <div className="card-details">
            {metadata.color && (
              <div className="card-tag">
                <strong>Color:</strong> {metadata.color}
              </div>
            )}
            
            {metadata.clarity && (
              <div className="card-tag">
                <strong>Clarity:</strong> {metadata.clarity}
              </div>
            )}
            
            {metadata.cut_quality && (
              <div className="card-tag">
                <strong>Cut:</strong> {metadata.cut_quality}
              </div>
            )}
            
            {metadata.lab && (
              <div className="card-tag">
                <strong>Lab:</strong> {metadata.lab}
              </div>
            )}

            {metadata.meas_length && metadata.meas_width && metadata.meas_depth && (
              <div className="card-tag">
                <strong>Dimensions:</strong>{' '}
                {metadata.meas_length.toFixed(2)} × {metadata.meas_width.toFixed(2)} ×{' '}
                {metadata.meas_depth.toFixed(2)} mm
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ResultsGrid



