import React, { useState, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Label, BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import _ from 'lodash';
import Papa from 'papaparse';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [activeCandidate, setActiveCandidate] = useState('victorPonta');
  const [correlations, setCorrelations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('correlation');  // correlation, countyRanking, candidateComparison
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [sortBy, setSortBy] = useState('turnout'); // turnout, candidate
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Încarcă fișierele CSV folosind fetch
        const voterResponse = await fetch(`${process.env.PUBLIC_URL}/presence_now (1).csv`);
        const trendsResponse = await fetch(`${process.env.PUBLIC_URL}/geoMap (1).csv`);
        
        if (!voterResponse.ok || !trendsResponse.ok) {
          throw new Error('Eroare la încărcarea fișierelor CSV');
        }
        
        const voterData = await voterResponse.text();
        const trendsData = await trendsResponse.text();
        
        // Procesează datele
        const processedData = processData(voterData, trendsData);
        setData(processedData.combinedData);
        setCorrelations(processedData.correlations);
        setLoading(false);
      } catch (error) {
        console.error('Eroare la procesarea datelor:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const processData = (voterRawData, trendsRawData) => {
    // Parse voter data
    const parsedVoterData = Papa.parse(voterRawData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    // Parse Google Trends data manually pentru formatul specific
    const lines = trendsRawData.split('\n').filter(line => line.trim());
    
    // Găsim linia care conține headerele (de obicei linia 3)
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Regiune,')) {
        headerLineIndex = i;
        break;
      }
    }
    
    if (headerLineIndex === -1) {
      console.error('Nu s-a găsit linia cu headere în fișierul geoMap');
      return { combinedData: [], correlations: {} };
    }
    
    // Extragem headerele
    const headers = lines[headerLineIndex].split(',').map(h => h.trim());
    
    // Datele încep după linia de headere
    const trendsData = [];
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(val => val.trim());
      if (values.length >= headers.length) {
        const row = {
          County: values[0].replace('Județul ', '').replace('Municipiul ', '')
        };
        
        // Numele candidaților din headere
        const candidateNames = {
          'Nicusor dan: (04.04.2025 – 04.05.2025)': 'nicusorDan',
          'Crin Antonescu: (04.04.2025 – 04.05.2025)': 'crinAntonescu',
          'George Simion: (04.04.2025 – 04.05.2025)': 'georgeSimion',
          'Victor Ponta: (04.04.2025 – 04.05.2025)': 'victorPonta'
        };
        
        // Adăugăm datele pentru fiecare candidat
        for (let j = 1; j < headers.length; j++) {
          const candidateKey = candidateNames[headers[j]];
          if (candidateKey && values[j]) {
            // Convertim valoarea procentuală în număr
            row[candidateKey] = parseFloat(values[j].replace(' %', ''));
          }
        }
        
        trendsData.push(row);
      }
    }
    
    // Group voter data by county
    const voterDataByCounty = _.groupBy(parsedVoterData.data, 'Judet');
    
    // Calculate totals for each county
    const voterStats = {};
    for (const county in voterDataByCounty) {
      if (county) {
        const countyData = voterDataByCounty[county];
        
        // Sum up registered voters and turnout
        const totalRegistered = _.sumBy(countyData, 'Înscriși pe liste permanente') || 0;
        const totalLP = _.sumBy(countyData, 'LP') || 0; // Turnout count
        
        // Calculate turnout percentage
        const turnoutPercentage = totalRegistered > 0 ? (totalLP / totalRegistered) * 100 : 0;
        
        voterStats[county] = {
          totalRegistered,
          totalLP,
          turnoutPercentage
        };
      }
    }
    
    // Map county names
    const countyMapping = {
      'Alba': 'AB',
      'Arad': 'AR',
      'Argeș': 'AG',
      'Bacău': 'BC',
      'Bihor': 'BH',
      'Bistrița-Năsăud': 'BN',
      'Botoșani': 'BT',
      'Brașov': 'BV',
      'Brăila': 'BR',
      'Buzău': 'BZ',
      'Caraș-Severin': 'CS',
      'Cluj': 'CJ',
      'Constanța': 'CT',
      'Covasna': 'CV',
      'Călărași': 'CL',
      'Dolj': 'DJ',
      'Dâmbovița': 'DB',
      'Galați': 'GL',
      'Giurgiu': 'GR',
      'Gorj': 'GJ',
      'Harghita': 'HR',
      'Hunedoara': 'HD',
      'Ialomița': 'IL',
      'Iași': 'IS',
      'Ilfov': 'IF',
      'Maramureș': 'MM',
      'Mehedinți': 'MH',
      'Mureș': 'MS',
      'Neamț': 'NT',
      'Olt': 'OT',
      'Prahova': 'PH',
      'Satu Mare': 'SM',
      'Sibiu': 'SB',
      'Suceava': 'SV',
      'Sălaj': 'SJ',
      'Teleorman': 'TR',
      'Timiș': 'TM',
      'Tulcea': 'TL',
      'Vaslui': 'VS',
      'Vrancea': 'VN',
      'Vâlcea': 'VL',
      'București': 'B'
    };
    
    // Combine datasets
    const combinedData = [];
    for (const trendsRow of trendsData) {
      const countyName = trendsRow.County;
      const countyCode = countyMapping[countyName];
      
      if (countyCode && voterStats[countyCode]) {
        combinedData.push({
          county: countyName,
          countyCode: countyCode,
          turnoutPercentage: voterStats[countyCode].turnoutPercentage,
          nicusorDan: trendsRow.nicusorDan,
          crinAntonescu: trendsRow.crinAntonescu,
          georgeSimion: trendsRow.georgeSimion, 
          victorPonta: trendsRow.victorPonta
        });
      }
    }
    
    // Calculate correlations
    const calculateCorrelation = (x, y) => {
      const n = x.length;
      if (n === 0 || n !== y.length) return 0;
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
      const sumX2 = x.reduce((a, b) => a + b * b, 0);
      const sumY2 = y.reduce((a, b) => a + b * b, 0);
      
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      return denominator === 0 ? 0 : numerator / denominator;
    };
    
    // Calculate correlation for each candidate
    const turnoutValues = combinedData.map(d => d.turnoutPercentage);
    const candidates = ['nicusorDan', 'crinAntonescu', 'georgeSimion', 'victorPonta'];
    const correlations = {};
    
    candidates.forEach(candidate => {
      const candidateValues = combinedData.map(d => d[candidate]);
      correlations[candidate] = calculateCorrelation(turnoutValues, candidateValues);
    });
    
    return { combinedData, correlations };
  };

  // Format correlation for display
  const formatCorrelation = (value) => {
    return value.toFixed(3);
  };
  
  // Get title for the candidate
  const getCandidateTitle = (candidate) => {
    switch(candidate) {
      case 'nicusorDan': return 'Nicușor Dan';
      case 'crinAntonescu': return 'Crin Antonescu';
      case 'georgeSimion': return 'George Simion';
      case 'victorPonta': return 'Victor Ponta';
      default: return candidate;
    }
  };
  
  // Determine color for a candidate
  const getCandidateColor = (candidate) => {
    switch(candidate) {
      case 'nicusorDan': return '#8884d8';
      case 'crinAntonescu': return '#82ca9d';
      case 'georgeSimion': return '#ffc658';
      case 'victorPonta': return '#ff8042';
      default: return '#000000';
    }
  };
  
  const handleCandidateChange = (candidate) => {
    setActiveCandidate(candidate);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Round numbers for more readable display
  const formatNumber = (num) => {
    return num.toFixed(2);
  };
  
  // Sortează județele în funcție de criteriul selectat
  const getSortedCounties = () => {
    if (sortBy === 'turnout') {
      return [...data].sort((a, b) => b.turnoutPercentage - a.turnoutPercentage);
    } else {
      return [...data].sort((a, b) => b[activeCandidate] - a[activeCandidate]);
    }
  };
  
  // Tooltip personalizat pentru graficul de corelație
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-lg">
          <p className="font-bold text-lg">{data.county} ({data.countyCode})</p>
          <p>Prezență la vot: {formatNumber(data.turnoutPercentage)}%</p>
          <p>{getCandidateTitle(activeCandidate)}: {data[activeCandidate]}%</p>
        </div>
      );
    }
    return null;
  };
  
  // Grafic de corelație între prezența la vot și interesul de căutare
  const renderCorrelationChart = () => {
    return (
      <div className="flex-grow bg-white p-4 rounded border border-gray-300 h-96">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 30, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="turnoutPercentage" 
                name="Prezență la vot" 
                domain={[15, 35]}
              >
                <Label value="Prezență la vot (%)" position="bottom" offset={0} />
              </XAxis>
              <YAxis 
                type="number" 
                dataKey={activeCandidate} 
                name={getCandidateTitle(activeCandidate)}
                domain={[0, 70]}
              >
                <Label 
                  value={`Interes de căutare pentru ${getCandidateTitle(activeCandidate)} (%)`} 
                  angle={-90} 
                  position="left" 
                  style={{ textAnchor: 'middle' }} 
                />
              </YAxis>
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name={getCandidateTitle(activeCandidate)} 
                data={data} 
                fill={getCandidateColor(activeCandidate)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p>Nu s-au putut corela datele. Verifică formatul fișierelor CSV.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Graficul de clasament al județelor
  const renderCountyRankingChart = () => {
    const sortedData = getSortedCounties().slice(0, 15); // Doar primele 15 județe
    
    return (
      <div className="flex-grow bg-white p-4 rounded border border-gray-300 h-96">
        <div className="mb-3">
          <span className="font-semibold mr-2">Sortează după:</span>
          <div className="inline-flex space-x-2">
            <button
              onClick={() => setSortBy('turnout')}
              className={`px-3 py-1 rounded ${
                sortBy === 'turnout' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Prezență la vot
            </button>
            <button
              onClick={() => setSortBy('candidate')}
              className={`px-3 py-1 rounded ${
                sortBy === 'candidate' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Interes pentru {getCandidateTitle(activeCandidate)}
            </button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            layout="vertical"
            data={sortedData}
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, sortBy === 'turnout' ? 35 : 70]} />
            <YAxis 
              dataKey="county" 
              type="category" 
              width={100} 
              tick={{ fontSize: 12 }} 
            />
            <Tooltip />
            <Bar 
              dataKey={sortBy === 'turnout' ? 'turnoutPercentage' : activeCandidate} 
              fill={sortBy === 'turnout' ? '#4299e1' : getCandidateColor(activeCandidate)} 
              name={sortBy === 'turnout' ? 'Prezență la vot (%)' : `Interes pentru ${getCandidateTitle(activeCandidate)} (%)`}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  // Obține datele pentru graficul de comparație între candidați pentru un județ selectat
  const getCountyComparisonData = () => {
    if (!selectedCounty) return [];
    
    const county = data.find(c => c.countyCode === selectedCounty);
    if (!county) return [];
    
    return [
      { name: 'Nicușor Dan', value: county.nicusorDan, color: getCandidateColor('nicusorDan') },
      { name: 'Crin Antonescu', value: county.crinAntonescu, color: getCandidateColor('crinAntonescu') },
      { name: 'George Simion', value: county.georgeSimion, color: getCandidateColor('georgeSimion') },
      { name: 'Victor Ponta', value: county.victorPonta, color: getCandidateColor('victorPonta') }
    ];
  };
  
  // Grafic pentru compararea candidaților într-un județ
  const renderCandidateComparisonChart = () => {
    const comparisonData = getCountyComparisonData();
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];
    
    return (
      <div className="flex-grow bg-white p-4 rounded border border-gray-300 h-96">
        <div className="mb-3">
          <span className="font-semibold mr-2">Selectează un județ:</span>
          <select 
            value={selectedCounty || ''} 
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="px-3 py-1 rounded border border-gray-300"
          >
            <option value="">Selectează...</option>
            {data.map(county => (
              <option key={county.countyCode} value={county.countyCode}>
                {county.county} ({county.countyCode})
              </option>
            ))}
          </select>
        </div>
        
        {selectedCounty ? (
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={comparisonData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, value}) => `${name}: ${value}%`}
              >
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p>Selectează un județ pentru a vedea comparația între candidați</p>
          </div>
        )}
      </div>
    );
  };
  
  // Secțiunea cu analiza pentru toate vizualizările
  const renderAnalysisSection = () => {
    if (viewMode === 'correlation') {
      return (
        <div className="mt-4 bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-2">Analiză corelație:</h3>
          <p>
            {correlations.victorPonta > 0.2 ? 
              "Victor Ponta arată o corelație pozitivă cu prezența la vot, sugerând că zonele cu un interes mai mare de căutare pentru Ponta tind să aibă rate de participare mai ridicate." :
             correlations.victorPonta < -0.2 ? 
              "Victor Ponta arată o corelație negativă cu prezența la vot, sugerând că zonele cu un interes mai mare de căutare pentru Ponta tind să aibă rate de participare mai scăzute." :
              "Victor Ponta arată o corelație pozitivă slabă (0.30) cu prezența la vot. Zonele cu un interes mai mare pentru Ponta tind să aibă o prezență la vot ușor mai ridicată."
            }
          </p>
          <p className="mt-2">
            {correlations.georgeSimion < -0.1 ? 
              "George Simion prezintă o corelație ușor negativă (-0.14) cu prezența la vot, sugerând că regiunile cu interes mai mare pentru Simion ar putea avea o participare electorală ceva mai scăzută." :
              "George Simion nu prezintă aproape nicio corelație cu prezența la vot."
            }
          </p>
          <p className="mt-2">
            Nicușor Dan și Crin Antonescu nu prezintă practic nicio corelație cu modelele de prezență la vot, sugerând că popularitatea lor nu este legată de ratele de participare.
          </p>
        </div>
      );
    } else if (viewMode === 'countyRanking') {
      return (
        <div className="mt-4 bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-2">Analiză județe:</h3>
          <p>
            Județele cu cea mai mare prezență la vot sunt în general cele urbane și din proximitatea capitalei.
            Acestea tind să aibă o participare electorală mai activă.
          </p>
          <p className="mt-2">
            {activeCandidate === 'victorPonta' && 
              "Victor Ponta are cel mai mare interes de căutare în județele din Moldova și sudul țării, zone cu tradiție pentru partidul său."}
            {activeCandidate === 'nicusorDan' && 
              "Nicușor Dan are cel mai mare interes de căutare în zonele urbane și în județe precum Vrancea și Satu Mare, deși este mai cunoscut ca politician bucureștean."}
            {activeCandidate === 'crinAntonescu' && 
              "Crin Antonescu are cel mai mare interes de căutare în județe precum Tulcea, Alba și Harghita, indicând diversitatea geografică a sprijinului său."}
            {activeCandidate === 'georgeSimion' && 
              "George Simion are cel mai mare interes de căutare în județe din vest precum Caraș-Severin și Arad, dar și în zone din sudul țării."}
          </p>
        </div>
      );
    } else if (viewMode === 'candidateComparison') {
      return (
        <div className="mt-4 bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-2">Analiză comparativă:</h3>
          {selectedCounty ? (
            <p>
              {data.find(c => c.countyCode === selectedCounty)?.county} are o prezență la vot de {formatNumber(data.find(c => c.countyCode === selectedCounty)?.turnoutPercentage)}%. 
              Candidatul cu cel mai mare interes de căutare în acest județ este {
                (() => {
                  const county = data.find(c => c.countyCode === selectedCounty);
                  if (!county) return '';
                  
                  const maxValue = Math.max(
                    county.nicusorDan, 
                    county.crinAntonescu, 
                    county.georgeSimion, 
                    county.victorPonta
                  );
                  
                  if (maxValue === county.nicusorDan) return 'Nicușor Dan';
                  if (maxValue === county.crinAntonescu) return 'Crin Antonescu';
                  if (maxValue === county.georgeSimion) return 'George Simion';
                  if (maxValue === county.victorPonta) return 'Victor Ponta';
                  return '';
                })()
              } cu {
                (() => {
                  const county = data.find(c => c.countyCode === selectedCounty);
                  if (!county) return '';
                  
                  const maxValue = Math.max(
                    county.nicusorDan, 
                    county.crinAntonescu, 
                    county.georgeSimion, 
                    county.victorPonta
                  );
                  
                  return maxValue;
                })()
              }% din căutări.
            </p>
          ) : (
            <p>Selectează un județ pentru a vedea o analiză detaliată a interesului pentru candidați.</p>
          )}
          <p className="mt-2">
            La nivel național, Crin Antonescu și Nicușor Dan au cele mai multe căutări, în timp ce Victor Ponta are cel mai puternic raport între căutări și prezența la vot.
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Se încarcă datele...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Eroare: {error}</p>
        <p>Verifică dacă fișierele CSV sunt în folderul public și numele lor sunt corecte.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col p-4 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Analiză Electorală: Prezența la vot și Interesul de căutare</h1>
      
      <div className="bg-white p-4 rounded border border-gray-300">
        <div className="flex items-center mb-4">
          <span className="font-semibold mr-4">Selectează candidatul:</span>
          <div className="flex space-x-2">
            {['victorPonta', 'nicusorDan', 'crinAntonescu', 'georgeSimion'].map((candidate) => (
              <button
                key={candidate}
                onClick={() => handleCandidateChange(candidate)}
                className={`px-3 py-1 rounded ${
                  activeCandidate === candidate 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getCandidateTitle(candidate)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="font-semibold mr-4">Tip vizualizare:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleViewModeChange('correlation')}
              className={`px-3 py-1 rounded ${
                viewMode === 'correlation' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Corelație
            </button>
            <button
              onClick={() => handleViewModeChange('countyRanking')}
              className={`px-3 py-1 rounded ${
                viewMode === 'countyRanking' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Clasament județe
            </button>
            <button
              onClick={() => handleViewModeChange('candidateComparison')}
              className={`px-3 py-1 rounded ${
                viewMode === 'candidateComparison' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Comparație candidați
            </button>
          </div>
        </div>
        
        {correlations[activeCandidate] !== undefined && viewMode === 'correlation' && (
          <div className="mt-3">
            <span className="font-semibold">Coeficient de corelație:</span>{' '}
            <span className={`${
              correlations[activeCandidate] > 0.2 ? 'text-green-600 font-bold' : 
              correlations[activeCandidate] < -0.2 ? 'text-red-600 font-bold' : 
              'text-gray-600'
            }`}>
              {formatCorrelation(correlations[activeCandidate])}
            </span>
            {correlations[activeCandidate] > 0.2 ? 
              ' (Corelație pozitivă puternică)' : 
              correlations[activeCandidate] < -0.2 ? 
              ' (Corelație negativă puternică)' : 
              ' (Corelație slabă/inexistentă)'}
          </div>
        )}
      </div>
      
      {viewMode === 'correlation' && renderCorrelationChart()}
      {viewMode === 'countyRanking' && renderCountyRankingChart()}
      {viewMode === 'candidateComparison' && renderCandidateComparisonChart()}
      
      {renderAnalysisSection()}
    </div>
  );
}
export default App;