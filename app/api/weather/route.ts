import { NextRequest, NextResponse } from 'next/server';

// Decode METAR string into structured data
function decodeMetar(raw: string) {
  const parts = raw.trim().split(/\s+/);
  const decoded: any = {
    raw,
    station: '',
    time: '',
    wind: { direction: 0, speed: 0, gust: 0, unit: 'KT', variable: false },
    visibility: '',
    clouds: [] as Array<{ cover: string; base: number | null }>,
    temperature: 0,
    dewpoint: 0,
    qnh: 0,
    conditions: [] as string[],
  };

  let i = 0;

  // Station
  if (parts[i] === 'METAR' || parts[i] === 'SPECI') i++;
  decoded.station = parts[i++];

  // Time (DDHHMMz)
  if (parts[i] && parts[i].endsWith('Z')) {
    decoded.time = parts[i++];
  }

  // AUTO or COR
  if (parts[i] === 'AUTO' || parts[i] === 'COR') {
    decoded.auto = parts[i] === 'AUTO';
    i++;
  }

  // Wind
  if (parts[i]) {
    const windMatch = parts[i].match(/^(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?(KT|MPS)$/);
    if (windMatch) {
      decoded.wind.direction = windMatch[1] === 'VRB' ? -1 : parseInt(windMatch[1]);
      decoded.wind.speed = parseInt(windMatch[2]);
      decoded.wind.gust = windMatch[4] ? parseInt(windMatch[4]) : 0;
      decoded.wind.unit = windMatch[5];
      decoded.wind.variable = windMatch[1] === 'VRB';
      i++;
    }
  }

  // Variable wind direction (e.g., 180V240)
  if (parts[i] && /^\d{3}V\d{3}$/.test(parts[i])) {
    decoded.wind.variableFrom = parseInt(parts[i].slice(0, 3));
    decoded.wind.variableTo = parseInt(parts[i].slice(4));
    i++;
  }

  // Visibility
  if (parts[i]) {
    if (parts[i] === 'CAVOK') {
      decoded.visibility = 'CAVOK';
      decoded.cavok = true;
      i++;
    } else if (/^\d{4}$/.test(parts[i])) {
      decoded.visibility = `${parseInt(parts[i])}m`;
      decoded.visibilityMetres = parseInt(parts[i]);
      i++;
    } else if (/^\d+SM$/.test(parts[i]) || /^\d+\/\d+SM$/.test(parts[i])) {
      decoded.visibility = parts[i];
      i++;
    }
  }

  // Weather conditions and clouds
  const weatherCodes: Record<string, string> = {
    'RA': 'Rain', 'SN': 'Snow', 'DZ': 'Drizzle', 'FG': 'Fog',
    'BR': 'Mist', 'HZ': 'Haze', 'TS': 'Thunderstorm', 'SH': 'Showers',
    'FZ': 'Freezing', 'GR': 'Hail', 'GS': 'Small Hail', 'PE': 'Ice Pellets',
    'IC': 'Ice Crystals', 'SG': 'Snow Grains', 'UP': 'Unknown Precipitation',
    'FU': 'Smoke', 'VA': 'Volcanic Ash', 'DU': 'Dust', 'SA': 'Sand',
    'PO': 'Dust Devils', 'SQ': 'Squalls', 'FC': 'Funnel Cloud',
    'SS': 'Sandstorm', 'DS': 'Duststorm',
  };

  const intensityPrefix: Record<string, string> = {
    '-': 'Light ', '+': 'Heavy ', 'VC': 'Vicinity ',
  };

  while (i < parts.length) {
    const part = parts[i];

    // Cloud layers
    const cloudMatch = part.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/);
    if (cloudMatch) {
      const coverNames: Record<string, string> = {
        'FEW': 'Few', 'SCT': 'Scattered', 'BKN': 'Broken',
        'OVC': 'Overcast', 'VV': 'Vertical Visibility'
      };
      decoded.clouds.push({
        cover: coverNames[cloudMatch[1]] || cloudMatch[1],
        base: parseInt(cloudMatch[2]) * 100,
        type: cloudMatch[3] || null
      });
      i++;
      continue;
    }

    // NSC or NCD
    if (part === 'NSC' || part === 'NCD' || part === 'SKC' || part === 'CLR') {
      decoded.clouds.push({ cover: 'Clear', base: null });
      i++;
      continue;
    }

    // Temperature/Dewpoint
    const tempMatch = part.match(/^(M?\d{2})\/(M?\d{2})$/);
    if (tempMatch) {
      decoded.temperature = parseInt(tempMatch[1].replace('M', '-'));
      decoded.dewpoint = parseInt(tempMatch[2].replace('M', '-'));
      i++;
      continue;
    }

    // QNH
    const qnhMatch = part.match(/^Q(\d{4})$/);
    if (qnhMatch) {
      decoded.qnh = parseInt(qnhMatch[1]);
      i++;
      continue;
    }

    // Altimeter (inches)
    const altMatch = part.match(/^A(\d{4})$/);
    if (altMatch) {
      decoded.qnh = Math.round(parseInt(altMatch[1]) * 0.338639);
      i++;
      continue;
    }

    // Weather conditions
    const wxMatch = part.match(/^([+-]|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(RA|SN|DZ|FG|BR|HZ|GR|GS|PE|IC|SG|UP|FU|VA|DU|SA|PO|SQ|FC|SS|DS)+$/);
    if (wxMatch) {
      let condition = '';
      if (wxMatch[1]) condition += intensityPrefix[wxMatch[1]] || '';
      // Extract all weather codes from the match
      const wxPart = part.replace(/^[+-]|^VC/, '');
      for (let j = 0; j < wxPart.length; j += 2) {
        const code = wxPart.slice(j, j + 2);
        if (weatherCodes[code]) {
          condition += weatherCodes[code] + ' ';
        }
      }
      decoded.conditions.push(condition.trim());
      i++;
      continue;
    }

    i++;
  }

  return decoded;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get('icao') || 'EGNR';

  try {
    // Fetch METAR from aviationweather.gov (free, no API key required)
    const metarResponse = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&hours=2`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!metarResponse.ok) {
      throw new Error(`METAR fetch failed: ${metarResponse.status}`);
    }

    const metarData = await metarResponse.json();

    if (!metarData || metarData.length === 0) {
      return NextResponse.json({ error: 'No METAR data available' }, { status: 404 });
    }

    // Get the most recent METAR
    const latestMetar = metarData[0];
    const decoded = decodeMetar(latestMetar.rawOb);

    // Also fetch TAF
    let tafData = null;
    try {
      const tafResponse = await fetch(
        `https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`,
        { next: { revalidate: 600 } } // Cache for 10 minutes
      );
      if (tafResponse.ok) {
        const tafJson = await tafResponse.json();
        if (tafJson && tafJson.length > 0) {
          tafData = tafJson[0].rawOb;
        }
      }
    } catch (e) {
      // TAF fetch is optional, don't fail if it errors
    }

    return NextResponse.json({
      metar: {
        raw: latestMetar.rawOb,
        decoded,
        observationTime: latestMetar.reportTime || decoded.time,
      },
      taf: tafData,
      icao,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data', details: error.message },
      { status: 500 }
    );
  }
}
