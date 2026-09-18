import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { MapPin, Users, ArrowRight } from 'lucide-react';

export default function BusStopsPage({ onSelectStop }) {
  const { selectedBusId } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [stopSummaries, setStopSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest(`/buses/${selectedBusId}/summary?date=${today}`)
      .then((res) => {
        if (res && res.stops) {
          setStopSummaries(res.stops);
        }
      })
      .catch((err) => console.warn('Error loading stops:', err))
      .finally(() => setLoading(false));
  }, [selectedBusId]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="section-label">BUS STOPS MANAGEMENT</span>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Assigned Stoppings & Demographics
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Loading bus stops...
          </div>
        ) : stopSummaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No stops defined for this bus.
          </div>
        ) : (
          stopSummaries.map((stop) => (
            <div
              key={stop.stop_id}
              onClick={() => onSelectStop && onSelectStop(stop.stop_id)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="var(--primary)" />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stop.stop_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>
                  <span>Inspect Stop</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Counts grid */}
              <div className="stop-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL STUDENTS</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{stop.total_students}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {stop.boys_count} Boys &bull; {stop.girls_count} Girls
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--status-present-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-present-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-present)', fontWeight: 700 }}>PRESENT TODAY</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-present)' }}>{stop.present_count}</div>
                  <div style={{ fontSize: '10px', color: 'var(--status-present)' }}>
                    {stop.total_students > 0 ? `${Math.round((stop.present_count / stop.total_students) * 100)}%` : '0%'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--status-absent-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-absent-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-absent)', fontWeight: 700 }}>ABSENT TODAY</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-absent)' }}>{stop.absent_count}</div>
                  <div style={{ fontSize: '10px', color: 'var(--status-absent)' }}>
                    Unmarked: {stop.unmarked_count}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
