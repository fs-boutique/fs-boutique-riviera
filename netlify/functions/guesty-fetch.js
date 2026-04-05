exports.handler = async (event) => {
  const reservationId = event.queryStringParameters?.reservationId;

  if (!reservationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'reservationId required' }) };
  }

  const clientId = process.env.GUESTY_CLIENT_ID;
  const clientSecret = process.env.GUESTY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Credentials not set' }) };
  }

  try {
    const authRes = await fetch('https://open-api.guesty.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'open-api', client_id: clientId, client_secret: clientSecret })
    });

    const authData = await authRes.json();
    if (!authData.access_token) return { statusCode: 401, body: JSON.stringify({ error: 'Auth failed', detail: JSON.stringify(authData) }) };

    const resRes = await fetch('https://open-api.guesty.com/v1/reservations/' + reservationId, {
      headers: { Authorization: 'Bearer ' + authData.access_token, Accept: 'application/json' }
    });

    const text = await resRes.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: 'Invalid response from Guesty', raw: text.substring(0, 200) }) }; }

    if (!resRes.ok) return { statusCode: 404, body: JSON.stringify({ error: 'Reservation not found', detail: text.substring(0, 200) }) };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: ((data.guest?.firstName || '') + ' ' + (data.guest?.lastName || '')).trim(),
        email: data.guest?.email || '',
        phone: data.guest?.phone || '',
        checkInDate: data.checkIn ? data.checkIn.split('T')[0] : '',
        checkOutDate: data.checkOut ? data.checkOut.split('T')[0] : '',
        totalGuests: data.guestsCount || 1,
        totalPrice: data.money?.totalPaid || 0
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
