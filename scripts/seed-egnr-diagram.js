// Script to seed EGNR (Hawarden) airport diagram data into the database
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// EGNR Label offsets for fine-tuning taxiway letter positions
const labelOffsets = {
  'A': { x: -40, y: -60 },
  'J': { x: 90, y: -125 },
  'N': { x: 0, y: 20 },
  'CP': { x: 0, y: 30 },
  'CB': { x: 0, y: 25 },
  'V1': { x: 10, y: -20 },
  'V2': { x: 20, y: -20 },
  'APRON-A': { x: 10, y: -5 },
  'APRON-B': { x: 0, y: -20 },
  'APRON-E': { x: -30, y: -5 },
  'APRON-C': { x: 0, y: -20 },
};

// EGNR Taxiways
const taxiways = [
  // Taxiway Alpha - 3 sections
  { id: 'A1', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 1', status: 'open', coordinates: [[[395, 441], [406, 430], [352, 381], [342, 391]]] },
  { id: 'A2', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 2', status: 'open', coordinates: [[[353, 381], [343, 391], [278, 325], [281, 314]]] },
  { id: 'A3', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 3', status: 'open', coordinates: [[[280, 326], [255, 303], [249, 303], [245, 306], [240, 313], [237, 321], [233, 329], [203, 477], [195, 477], [227, 324], [233, 309], [239, 298], [246, 293], [253, 292], [281, 317]]] },
  // Taxiway Bravo - 1 section
  { id: 'B', name: 'Taxiway Bravo', status: 'open', coordinates: [[[419, 462], [429, 451], [471, 487], [461, 499]]] },
  // Taxiway Charlie - 3 sections
  { id: 'C1', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 1', status: 'open', coordinates: [[[777, 59], [783, 50], [800, 68], [813, 89], [806, 95], [794, 75]]] },
  { id: 'C2', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 2', status: 'open', coordinates: [[[813, 92], [823, 111], [833, 130], [840, 143], [855, 155], [849, 162], [836, 150], [828, 136], [807, 97]]] },
  { id: 'C3', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 3', status: 'open', coordinates: [] },
  // Taxiway Delta - 3 sections
  { id: 'D1', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 1', status: 'open', coordinates: [[[273, 588], [296, 561], [300, 456], [277, 457]]] },
  { id: 'D2', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 2', status: 'open', coordinates: [[[277, 456], [299, 455], [303, 357], [281, 332]]] },
  { id: 'D3', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 3', status: 'open', coordinates: [[[281, 316], [304, 336], [308, 234], [285, 234]]] },
  // Taxiway Echo - 1 section
  { id: 'E', name: 'Taxiway Echo', status: 'open', coordinates: [[[503, 366], [515, 352], [556, 393], [547, 403]]] },
  // Taxiway Golf - 2 sections
  { id: 'G1', name: 'Taxiway Golf', parentId: 'G', sectionLabel: 'Section 1', status: 'open', coordinates: [[[504, 317], [521, 298], [459, 244], [444, 260]]] },
  { id: 'G2', name: 'Taxiway Golf', parentId: 'G', sectionLabel: 'Section 2', status: 'open', coordinates: [] },
  // Hotel - 1 section
  { id: 'H', name: 'H Spot', status: 'open', coordinates: [[[436, 255], [453, 236], [425, 211], [417, 239]]] },
  // Taxiway Juliet - 3 sections
  { id: 'J1', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 1', status: 'open', coordinates: [[[339, 366], [438, 255], [444, 260], [345, 371]]] },
  { id: 'J2', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 2', status: 'open', coordinates: [[[438, 255], [513, 168], [518, 173], [443, 259]]] },
  { id: 'J3', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 3', status: 'open', coordinates: [[[513, 169], [516, 164], [516, 156], [512, 69], [514, 63], [520, 56], [519, 44], [534, 52], [528, 55], [524, 61], [520, 68], [520, 76], [523, 155], [525, 164], [522, 170], [518, 175]]] },
  // Taxiway November - 3 sections
  { id: 'N1', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 1', status: 'open', coordinates: [[[639, 51], [691, 36], [711, 30], [725, 29], [739, 30], [753, 33], [748, 40], [737, 39], [724, 38], [711, 41], [692, 45], [639, 57]]] },
  { id: 'N2', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 2', status: 'open', coordinates: [[[578, 60], [593, 61], [611, 57], [639, 50], [641, 59], [613, 65], [593, 69], [575, 67]]] },
  { id: 'N3', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 3', status: 'open', coordinates: [[[463, 18], [523, 35], [560, 52], [579, 61], [578, 70], [555, 61], [517, 44], [491, 35], [461, 28]]] },
  // Compass Base - 1 section
  { id: 'CB', name: 'Compass Base', status: 'open', coordinates: [[[557, 62], [552, 74], [546, 78], [545, 85], [550, 89], [558, 87], [557, 79], [564, 65]]] },
  // Critical Parts - 1 section
  { id: 'CP', name: 'Critical Parts', status: 'open', coordinates: [[[643, 494], [662, 475], [635, 449], [617, 448], [604, 437], [596, 448], [614, 460], [616, 466], [641, 491]]] },
  // Taxiway Victor - 2 sections
  { id: 'V1', name: 'Taxiway Victor', parentId: 'V1', sectionLabel: 'Section 1', status: 'open', coordinates: [[[278, 727], [242, 778], [232, 787], [219, 793], [205, 796], [188, 795], [145, 775], [153, 769], [186, 786], [199, 788], [211, 785], [223, 780], [270, 717]]] },
  { id: 'V2', name: 'Taxiway Victor', parentId: 'V2', sectionLabel: 'Section 2', status: 'open', coordinates: [[[125, 743], [116, 735], [115, 716], [116, 697], [122, 679], [132, 665], [148, 644], [141, 640], [130, 658], [120, 666], [114, 679], [110, 691], [106, 705], [106, 720], [107, 731], [109, 742], [117, 751]]] },
];

// EGNR Aprons (stored separately from taxiways)
const aprons = [
  { id: 'APRON-A', name: 'Apron Alpha', status: 'open', coordinates: [[[210, 456], [231, 459], [243, 402], [221, 395]]] },
  { id: 'APRON-B', name: 'Apron Bravo', status: 'open', coordinates: [[[462, 501], [490, 524], [536, 478], [521, 463], [495, 489], [473, 487]]] },
  { id: 'APRON-E', name: 'Apron Echo', status: 'open', coordinates: [[[557, 395], [599, 435], [590, 442], [582, 436], [569, 438], [569, 456], [566, 461], [550, 462], [537, 475], [529, 466], [540, 454], [538, 436], [542, 433], [560, 431], [561, 420], [548, 403]]] },
  { id: 'APRON-C', name: 'Apron Charlie', status: 'open', coordinates: [[[814, 91], [834, 80], [830, 69], [843, 62], [855, 81], [840, 88], [837, 86], [820, 99]]] },
];

// EGNR Runways
const runways = [
  // Runway 04/22 - 3 sections
  { id: 'RWY1', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 1', status: 'open', coordinates: [[[144, 773], [417, 461], [399, 446], [124, 751]]] },
  { id: 'RWY2', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 2', status: 'open', coordinates: [[[401, 446], [571, 247], [588, 262], [416, 461]]] },
  { id: 'RWY3', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 3', status: 'open', coordinates: [[[571, 246], [775, 14], [799, 32], [586, 263]]] },
];

async function seedEGNRDiagram() {
  const client = await pool.connect();

  try {
    console.log('Starting EGNR diagram seeding...');

    // First, check if Hawarden airport exists, if not create it
    let airportResult = await client.query(
      "SELECT id FROM airports WHERE icao_code = 'EGNR'"
    );

    let airportId;

    if (airportResult.rows.length === 0) {
      console.log('EGNR airport not found. Creating Hawarden Airport...');

      const insertResult = await client.query(`
        INSERT INTO airports (icao_code, iata_code, name, country, timezone, is_active)
        VALUES ('EGNR', 'CEG', 'Hawarden Airport', 'United Kingdom', 'Europe/London', true)
        RETURNING id
      `);

      airportId = insertResult.rows[0].id;
      console.log(`Created Hawarden Airport with ID: ${airportId}`);
    } else {
      airportId = airportResult.rows[0].id;
      console.log(`Found EGNR airport with ID: ${airportId}`);
    }
    console.log(`Found EGNR airport with ID: ${airportId}`);

    // Check if diagram already exists
    const existingDiagram = await client.query(
      'SELECT id FROM airport_diagrams WHERE airport_id = $1',
      [airportId]
    );

    if (existingDiagram.rows.length > 0) {
      console.log('Diagram already exists for EGNR. Updating...');

      await client.query(`
        UPDATE airport_diagrams
        SET
          taxiways = $1,
          runways = $2,
          aprons = $3,
          label_offsets = $4,
          image_width = 1000,
          image_height = 800,
          updated_at = NOW()
        WHERE airport_id = $5
      `, [
        JSON.stringify(taxiways),
        JSON.stringify(runways),
        JSON.stringify(aprons),
        JSON.stringify(labelOffsets),
        airportId
      ]);

      console.log('EGNR diagram updated successfully!');
    } else {
      console.log('Creating new diagram for EGNR...');

      await client.query(`
        INSERT INTO airport_diagrams (
          airport_id,
          taxiways,
          runways,
          aprons,
          label_offsets,
          image_width,
          image_height
        ) VALUES ($1, $2, $3, $4, $5, 1000, 800)
      `, [
        airportId,
        JSON.stringify(taxiways),
        JSON.stringify(runways),
        JSON.stringify(aprons),
        JSON.stringify(labelOffsets)
      ]);

      console.log('EGNR diagram created successfully!');
    }

    // Verify the data was saved
    const verify = await client.query(
      'SELECT id, airport_id, image_width, image_height, jsonb_array_length(taxiways) as taxiway_count, jsonb_array_length(runways) as runway_count, jsonb_array_length(aprons) as apron_count FROM airport_diagrams WHERE airport_id = $1',
      [airportId]
    );

    if (verify.rows.length > 0) {
      const row = verify.rows[0];
      console.log('\nVerification:');
      console.log(`  Diagram ID: ${row.id}`);
      console.log(`  Image dimensions: ${row.image_width} x ${row.image_height}`);
      console.log(`  Taxiways: ${row.taxiway_count}`);
      console.log(`  Runways: ${row.runway_count}`);
      console.log(`  Aprons: ${row.apron_count}`);
    }

  } catch (error) {
    console.error('Error seeding EGNR diagram:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedEGNRDiagram();
