'use client';

import { useState, useEffect } from 'react';

async function simpleFetch() {
  try {
    console.log('Starting simple fetch...');
    const response = await fetch('/api/test-fetch');
    console.log('Got response:', response.status);
    const data = await response.json();
    console.log('Got data:', data);
    return data;
  } catch (error) {
    console.error('Simple fetch error:', error);
    throw error;
  }
}

export default function TestSimplePage() {
  const [status, setStatus] = useState('Starting...');
  const [data, setData] = useState(null);

  useEffect(() => {
    console.log('Effect running...');
    setStatus('Fetching...');
    
    simpleFetch()
      .then((result) => {
        console.log('Success:', result);
        setStatus('Success');
        setData(result);
      })
      .catch((error) => {
        console.error('Error:', error);
        setStatus('Error: ' + error.message);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Simple Fetch Test</h1>
      <div>Status: {status}</div>
      {data && (
        <pre style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
} 