

import React, { useEffect, useRef, useState } from 'react';
import { StockDetails, TopInstitutionalHolder } from '../types';
import { formatMarketCap, getTextSimpleScoreColor, getSimpleScoreColor } from '../services/stockService';
import { generateInvestmentThesis } from '../services/aiService';
import { CloseIcon } from './icons';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface StockDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockDetails: StockDetails | null;
  isLoading: boolean;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number | undefined | null; id?: string; className?: string }> = ({ label, value, id, className="" }) => (
  <div className={`flex flex-col ${className} break-words`}>
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="font-medium text-gray-800 dark:text-gray-200" id={id}>{value ?? 'N/A'}</span>
  </div>
);


const StockDetailsModal: React.FC<StockDetailsModalProps> = ({ isOpen, onClose, stockDetails, isLoading, watchlist, onToggleWatchlist }) => {
  const priceChartRef = useRef<HTMLCanvasElement>(null);
  const financialsChartRef = useRef<HTMLCanvasElement>(null);
  const priceChartInstanceRef = useRef<Chart | null>(null);
  const financialsChartInstanceRef = useRef<Chart | null>(null);

  // AI Thesis State
  const [aiThesis, setAiThesis] = useState<string | null>(null);
  const [isGeneratingThesis, setIsGeneratingThesis] = useState<boolean>(false);
  const [thesisError, setThesisError] = useState<string | null>(null);

  useEffect(() => {
    // Reset AI thesis state whenever the modal opens with stock details, or when it closes
    if (isOpen && stockDetails) {
        setAiThesis(null);
        setIsGeneratingThesis(false);
        setThesisError(null);
    } else if (!isOpen) {
        setAiThesis(null);
        setIsGeneratingThesis(false);
        setThesisError(null);
    }
  }, [isOpen, stockDetails?.symbol]); // Use stockDetails.symbol to trigger reset if stock changes while modal is already open (less common scenario but safe)


  useEffect(() => {
    if (!isOpen || !stockDetails || isLoading) {
      if (priceChartInstanceRef.current) priceChartInstanceRef.current.destroy();
      if (financialsChartInstanceRef.current) financialsChartInstanceRef.current.destroy();
      return;
    }
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#CBD5E0' : '#4A5568';

    if (priceChartInstanceRef.current) priceChartInstanceRef.current.destroy();
    if (financialsChartInstanceRef.current) financialsChartInstanceRef.current.destroy();

    if (priceChartRef.current && stockDetails.historicalPriceData && stockDetails.historicalPriceData.length > 0) {
      const labels = stockDetails.historicalPriceData.map(d => d.date);
      const data = stockDetails.historicalPriceData.map(d => d.close);
      priceChartInstanceRef.current = new Chart(priceChartRef.current, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Price', data: data, borderColor: '#3B82F6', borderWidth: 2, pointRadius: 0, tension: 0.1,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { x: { display: false, grid: { display: false } }, y: { display: false, grid: { display: false } } },
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => `Price: $${Number(c.raw).toFixed(2)}` } } }
        }
      });
    }

    if (financialsChartRef.current && stockDetails.historicalFinancials && stockDetails.historicalFinancials.length > 0) {
      const financialLabels = stockDetails.historicalFinancials.map(f => f.year.toString());
      const shareCountData = stockDetails.historicalFinancials.map(f => f.commonStockSharesOutstanding ? f.commonStockSharesOutstanding / 1000000 : null);
      const rotceData = stockDetails.historicalFinancials.map(f => f.calculatedROTCE !== null && f.calculatedROTCE !== undefined ? f.calculatedROTCE * 100 : null);
      financialsChartInstanceRef.current = new Chart(financialsChartRef.current, {
        type: 'bar',
        data: {
          labels: financialLabels,
          datasets: [
            { type: 'bar', label: 'Share Count (M)', data: shareCountData, backgroundColor: isDarkMode ? 'rgba(59,130,246,0.7)' : 'rgba(59,130,246,0.5)', borderColor: isDarkMode ? '#3B82F6':'#2563EB', yAxisID: 'yShareCount', order: 2 },
            { type: 'line', label: 'ROTCE (%)', data: rotceData, borderColor: isDarkMode ? '#F59E0B':'#D97706', backgroundColor: isDarkMode ? 'rgba(245,158,11,0.5)':'rgba(217,119,6,0.5)', borderWidth: 2, pointRadius: 3, tension: 0.1, yAxisID: 'yROTCE', order: 1, fill: false, }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { grid: { color: gridColor, display: false }, ticks: { color: textColor, font: { size: 10 } } },
            yShareCount: { type: 'linear', position: 'left', title: { display: true, text: 'Share Count (M)', color: textColor, font: { size: 10 } }, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: (v) => `${v}M` } },
            yROTCE: { type: 'linear', position: 'right', title: { display: true, text: 'ROTCE (%)', color: textColor, font: { size: 10 } }, grid: { display: false }, ticks: { color: textColor, font: { size: 10 }, callback: (v) => `${v}%` } }
          },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: textColor, font: {size: 10}} },
            tooltip: {
                mode: 'index', intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += Number(context.parsed.y).toFixed(1) + (context.dataset.yAxisID === 'yROTCE' ? '%' : 'M');
                        }
                        return label;
                    }
                }
            }
          }
        }
      });
    }
    
    return () => {
      if (priceChartInstanceRef.current) priceChartInstanceRef.current.destroy();
      if (financialsChartInstanceRef.current) financialsChartInstanceRef.current.destroy();
      priceChartInstanceRef.current = null;
      financialsChartInstanceRef.current = null;
    };
  }, [isOpen, stockDetails, isLoading]);


  if (!isOpen) return null;

  const priceAndScoreColor = stockDetails ? getTextSimpleScoreColor(stockDetails.simpleScore) : '';
  const scoreBadgeColor = stockDetails ? getSimpleScoreColor(stockDetails.simpleScore) : '';
  const isWatchlisted = stockDetails ? watchlist.includes(stockDetails.symbol) : false;

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stockDetails) onToggleWatchlist(stockDetails.symbol);
  };
  
  const handleExportCsv = () => {
    if (!stockDetails) return;
    const headers = "Symbol,Name,Price,P/E_TTM,ROE_TTM,Simple_Score\n";
    const row = [
      stockDetails.symbol, `"${stockDetails.name.replace(/"/g, '""')}"`, stockDetails.price,
      stockDetails.peRatioTTM ?? 'N/A', stockDetails.returnOnEquityTTM ?? 'N/A', stockDetails.simpleScore ?? 'N/A'
    ].join(',');
    const link = document.createElement("a");
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURI(headers + row));
    link.setAttribute("download", `${stockDetails.symbol}_metrics.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleGenerateThesis = async () => {
    if (!stockDetails) return;
    setIsGeneratingThesis(true);
    setAiThesis(null);
    setThesisError(null);
    try {
      const thesis = await generateInvestmentThesis(stockDetails);
      setAiThesis(thesis);
    } catch (error: any) {
      console.error("Error generating AI thesis in modal:", error);
      setThesisError(error.message || "Failed to generate AI thesis. Please ensure your Gemini API key is configured correctly and try again later.");
    } finally {
      setIsGeneratingThesis(false);
    }
  };
  
  let intrinsicValueDisplay = <DetailItem label="Owner Earnings x10 (FCF Proxy)" value="N/A" />;
  if (stockDetails?.freeCashFlowPerShareTTM) {
    const ownerEarnings10x = stockDetails.freeCashFlowPerShareTTM * 10;
    intrinsicValueDisplay = (
      <div className="flex flex-col">
        <span className="text-sm text-gray-500 dark:text-gray-400">Owner Earnings x10 (FCF Proxy)</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">${ownerEarnings10x.toFixed(2)}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Bands: ${(ownerEarnings10x * 0.7).toFixed(2)} - ${(ownerEarnings10x * 1.3).toFixed(2)}</span>
      </div>
    );
  }

  let liquidityEstimateDisplay = <DetailItem label="Days to trade $10k (10% ADV)" value="N/A" />;
  if (stockDetails?.avgVolume && stockDetails.price && stockDetails.avgVolume > 0 && stockDetails.price > 0) {
      const dailyTradeableValue = stockDetails.avgVolume * stockDetails.price * 0.10;
      liquidityEstimateDisplay = <DetailItem label="Days to trade $10k (10% ADV)" value={dailyTradeableValue > 0 ? `${(10000 / dailyTradeableValue).toFixed(1)} days` : "N/A"} />;
  }

  let keywordHitsDisplay = null;
  if (stockDetails?.description) {
    const desc = stockDetails.description.toLowerCase();
    keywordHitsDisplay = (
        <>
            <DetailItem label="'Brand' Mentions" value={(desc.match(/brand/gi) || []).length} />
            <DetailItem label="'Network Effect' Mentions" value={(desc.match(/network effect/gi) || []).length} />
        </>
    );
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} aria-modal="true" role="dialog" aria-labelledby="stockDetailsModalTitle">
      <div className="modal-content-inner modal-content-bg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        {isLoading && <p className="text-center text-gray-700 dark:text-gray-300 py-10">Loading details...</p>}
        {!isLoading && !stockDetails && <p className="text-center text-red-500 py-10">Failed to load stock details.</p>}
        
        {!isLoading && stockDetails && (
          <>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold flex items-center" id="stockDetailsModalTitle">
                  <span>{stockDetails.symbol}</span>
                  {stockDetails.hasCatalyst && <span className="ml-2 text-yellow-500" title="Confirmed special-situation catalyst (e.g., spin-off).">⭐</span>}
                  <button onClick={handleStarClick} className={`ml-3 p-1 rounded-full text-2xl focus:outline-none ${isWatchlisted ? 'text-yellow-500 hover:text-yellow-400' : 'text-gray-400 hover:text-yellow-400 dark:text-gray-500 dark:hover:text-yellow-300'}`} aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"} title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}>
                    {isWatchlisted ? '★' : '☆'}
                  </button>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stockDetails.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{stockDetails.sector} {stockDetails.industry && `- ${stockDetails.industry}`}</p>
              </div>
              <button className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none p-1" onClick={onClose} aria-label="Close stock details">
                <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            {stockDetails.image && <img src={stockDetails.image} alt={`${stockDetails.name} logo`} className="w-12 h-12 sm:w-16 sm:h-16 mb-3 rounded-full object-contain border border-gray-200 dark:border-gray-700" onError={(e) => (e.currentTarget.style.display = 'none')} />}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              <DetailItem label="Price" value={stockDetails.price ? `$${stockDetails.price.toFixed(2)}` : 'N/A'} className={`text-lg font-bold ${priceAndScoreColor}`} />
              <div className="flex flex-col"><span className="text-sm text-gray-500 dark:text-gray-400">Score</span><span className={`font-medium text-lg ${priceAndScoreColor} ${scoreBadgeColor} px-2 py-0.5 rounded-md self-start`}>{stockDetails.simpleScore ?? 'N/A'}</span></div>
            </div>

            {stockDetails.website && <p className="text-sm mb-4"><a href={stockDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Visit Website</a></p>}
            
            <div className="space-y-5">
                <div>
                    <h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Description</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto">{stockDetails.description || "No description available."}</p>
                </div>

                <div>
                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Key Financials</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                      {[
                        { label: "Market Cap", value: formatMarketCap(stockDetails.marketCap) },
                        { label: "P/E (TTM)", value: stockDetails.peRatioTTM?.toFixed(2) ?? "N/A" },
                        { label: "Div Yield", value: stockDetails.dividendYield },
                        { label: "52W High", value: stockDetails['52WeekHigh'] }, { label: "52W Low", value: stockDetails['52WeekLow'] },
                        { label: "Debt/Equity (TTM)", value: stockDetails.debtEquityRatioTTM?.toFixed(2) ?? "N/A" },
                        { label: "Debt/EBITDA (TTM)", value: stockDetails.debtEbitda }, { label: "EV/EBITDA (TTM)", value: stockDetails.evEbit },
                        { label: "FCF/NI (TTM)", value: stockDetails.fcfNi }, { label: "ROE (TTM)", value: stockDetails.rotce },
                        { label: "CEO", value: stockDetails.ceo },
                        { label: "Employees", value: stockDetails.fullTimeEmployees ? Number(stockDetails.fullTimeEmployees).toLocaleString() : "N/A" },
                      ].map(item => <DetailItem key={item.label} label={item.label} value={item.value} />)}
                    </div>
                </div>

                {/* AI Investment Thesis Section */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">🤖 AI Investment Thesis</h4>
                    <button onClick={handleGenerateThesis} disabled={isGeneratingThesis || !stockDetails} className="ai-thesis-button" aria-live="polite">
                      {isGeneratingThesis ? 'Generating...' : '✨ Generate Thesis'}
                    </button>
                  </div>
                  {isGeneratingThesis && <div className="ai-thesis-loading">Generating AI thesis, please wait...</div>}
                  {thesisError && <div className="ai-thesis-error"><p><strong>Error:</strong> {thesisError}</p></div>}
                  {aiThesis && !isGeneratingThesis && !thesisError && <div className="ai-thesis-content-area">{aiThesis}</div>}
                </div>

                {stockDetails.institutionalOwnershipSummary && (
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Institutional Ownership</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm mb-2">
                      <DetailItem label="Inst. Own %" value={stockDetails.institutionalOwnershipSummary.institutionalOwnershipPercentage?.toFixed(2) + '%' ?? 'N/A'} />
                      <DetailItem label="# Inst. Pos" value={stockDetails.institutionalOwnershipSummary.numberOfInstitutionalPositions?.toLocaleString() ?? 'N/A'} />
                      <DetailItem label="Total Inst. Value" value={stockDetails.institutionalOwnershipSummary.totalInstitutionalValue ? `$${stockDetails.institutionalOwnershipSummary.totalInstitutionalValue.toLocaleString()}` : 'N/A'} />
                      <DetailItem label="Data As Of" value={stockDetails.institutionalOwnershipSummary.date ? new Date(stockDetails.institutionalOwnershipSummary.date).toLocaleDateString() : 'N/A'} />
                    </div>
                    {stockDetails.topInstitutionalHolders && stockDetails.topInstitutionalHolders.length > 0 && (
                      <><h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2 mb-1">Top Holders:</h5>
                      <ul className="list-none space-y-1 text-xs max-h-28 overflow-y-auto">
                        {stockDetails.topInstitutionalHolders.map((h, i) => (
                          <li key={i} className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{h.holder}</span>: {h.shares.toLocaleString()} shares (Value: ${((h.shares * (stockDetails.price || 0))).toLocaleString()})
                            {h.change ? <span className={`ml-1 ${h.change > 0 ? 'text-green-500':'text-red-500'}`}>({h.change > 0 ? '+':''}{h.change.toLocaleString()})</span>:''}
                          </li>))}
                      </ul></>
                    )}
                  </div>
                )}

                {stockDetails.latestTranscript && (
                  <div>
                    <h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Earnings Call Transcript</h4>
                    <p className="text-sm"><a href={stockDetails.latestTranscript.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                      Latest Transcript ({new Date(stockDetails.latestTranscript.date).toLocaleDateString()} - Q{stockDetails.latestTranscript.quarter} {stockDetails.latestTranscript.year})
                    </a></p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">{intrinsicValueDisplay}{liquidityEstimateDisplay}</div>
                {keywordHitsDisplay && (<div><h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Description Keyword Hits</h4><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">{keywordHitsDisplay}</div></div>)}

                <div>
                    <h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Charts</h4>
                    <div className="mb-4"><h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">90-Day Price Trend</h5><div className="w-full h-32 bg-gray-50 dark:bg-gray-700 rounded-md p-1">{stockDetails.historicalPriceData?.length ? <canvas ref={priceChartRef}></canvas> : <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">Price data N/A.</div>}</div></div>
                    <div><h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">10-Year Share Count & ROTCE</h5><div className="w-full h-56 bg-gray-50 dark:bg-gray-700 rounded-md p-1">{stockDetails.historicalFinancials?.length ? <canvas ref={financialsChartRef}></canvas> : <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500">Historical financials N/A.</div>}</div></div>
                </div>
                
                <div><h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Analyst Notes (UI Mockup)</h4><textarea className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm" rows={2} placeholder="Your notes..."></textarea><div className="flex items-center mt-1"><span className="text-xs mr-2 text-gray-600 dark:text-gray-400">Conviction:</span>{'★☆☆☆☆'.split('').map((s, i) => <span key={i} className="text-yellow-400 text-xl cursor-pointer hover:text-yellow-300" title={`Rate ${i+1} star${i>0?'s':''}`}>{s}</span>)}</div></div>

                <div>
                    <h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Latest News</h4>
                    <ul className="list-none space-y-2 text-sm max-h-40 overflow-y-auto">
                      {stockDetails.latestNews?.length ? stockDetails.latestNews.slice(0,3).map((n, i) => (<li key={i} className="pb-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0"><a href={n.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300 font-medium">{n.title}</a><span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{n.date}</span></li>)) : <li className="text-gray-500 dark:text-gray-400">No recent news.</li>}
                    </ul>
                </div>
                
                <div className="mt-4 text-right"><button onClick={handleExportCsv} className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400">Export Key Metrics (CSV)</button></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockDetailsModal;