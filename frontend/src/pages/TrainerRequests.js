import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function TrainerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/trainings/requests/');
      setRequests(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (id, status) => {
    try {
      await api.patch(`/trainings/requests/${id}/`, {
        status,
      });

      setRequests((prev) =>
        prev.map((request) =>
          request.id === id
            ? { ...request, status }
            : request
        )
      );
    } catch (err) {
      console.log(err);
      alert('Error updating request');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'ACCEPTED') return '#22c55e';
    if (status === 'REJECTED') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
      }}
    >
      <nav
        style={{
          height: '80px',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          background: '#111',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ff6b00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            LP
          </div>

          <h2 style={{ margin: 0 }}>
            LikeAPro
          </h2>
        </div>

        <Link
          to="/trainer"
          style={{
            textDecoration: 'none',
            background: '#ff6b00',
            color: '#fff',
            padding: '12px 22px',
            borderRadius: '12px',
            fontWeight: 'bold',
          }}
        >
          Back
        </Link>
      </nav>

      <div
        style={{
          padding: '50px',
          maxWidth: '1300px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            marginBottom: '10px',
            color: '#ff6b00',
          }}
        >
          Client Requests
        </h1>

        <p
          style={{
            color: '#888',
            marginBottom: '40px',
            fontSize: '18px',
          }}
        >
          Accept or reject incoming client requests.
        </p>

        {loading ? (
          <div
            style={{
              color: '#888',
              fontSize: '18px',
            }}
          >
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              color: '#777',
            }}
          >
            No pending requests.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '25px',
            }}
          >
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: '22px',
                  padding: '30px',
                  transition: '0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '20px',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '30px',
                      }}
                    >
                      Client #{request.client}
                    </h2>

                    <p
                      style={{
                        marginTop: '10px',
                        color: '#888',
                        fontSize: '15px',
                      }}
                    >
                      Request ID: {request.id}
                    </p>
                  </div>

                  <div
                    style={{
                      background: getStatusColor(request.status),
                      color: '#fff',
                      padding: '10px 18px',
                      borderRadius: '999px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                    }}
                  >
                    {request.status}
                  </div>
                </div>

                {request.status === 'PENDING' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '15px',
                      marginTop: '30px',
                    }}
                  >
                    <button
                      onClick={() =>
                        updateRequest(
                          request.id,
                          'ACCEPTED'
                        )
                      }
                      style={acceptButton}
                    >
                      Accept
                    </button>

                    <button
                      onClick={() =>
                        updateRequest(
                          request.id,
                          'REJECTED'
                        )
                      }
                      style={rejectButton}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const acceptButton = {
  padding: '14px 26px',
  border: 'none',
  borderRadius: '12px',
  background: '#ff6b00',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '15px',
};

const rejectButton = {
  padding: '14px 26px',
  border: 'none',
  borderRadius: '12px',
  background: '#2a2a2a',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '15px',
};