import React, { useState, useRef, useEffect } from 'react';

export default function ElectionsTimeline() {
  const timelineRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Election data with CORRECT dates (all Tuesdays!)
  const elections = [
    // 2020
    { date: '2020-03-17', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election. Presidential primary included.' },
    { date: '2020-11-03', type: 'presidential', title: 'General Election (Presidential)', description: 'Vote for President, U.S. House, State Legislature, County offices, and local issues.' },
    
    // 2021
    { date: '2021-11-02', type: 'municipal', title: 'Hometown Election', description: 'Vote for Mayor, City Council members, School Board members, Township Trustees, and local issues.' },
    
    // 2022
    { date: '2022-05-03', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election.' },
    { date: '2022-11-08', type: 'general', title: 'General Election (Midterm)', description: 'Vote for U.S. House, Governor, State Legislature, County Commissioners, Sheriff, Judges, and local issues.' },
    
    // 2023
    { date: '2023-11-07', type: 'municipal', title: 'Hometown Election', description: 'Vote for Mayor, City Council members, School Board members, and local issues. State issues also on ballot.', showResults: true },
    
    // 2024
    { date: '2024-03-19', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election. Presidential primary included.' },
    { date: '2024-11-05', type: 'presidential', title: 'General Election (Presidential)', description: 'Vote for President, U.S. Senate, U.S. House, State Legislature, and local issues.', showResults: true },
    
    // 2025
    { date: '2025-11-04', type: 'municipal', title: 'Hometown Election', description: 'Vote for Mayor, City Council members, School Board members, and local issues.', showResults: true },
    
    // 2026
    { date: '2026-05-05', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election.' },
    { date: '2026-11-03', type: 'general', title: 'General Election (Midterm)', description: 'Vote for U.S. House, Governor, U.S. Senate, State Legislature, County offices, and Judges.' },
    
    // 2027
    { date: '2027-05-04', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election.' },
    { date: '2027-11-02', type: 'municipal', title: 'Hometown Election', description: 'Vote for Mayor, City Council members, School Board members, and local issues.' },
    
    // 2028
    { date: '2028-03-21', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election. Presidential primary included.' },
    { date: '2028-11-07', type: 'presidential', title: 'General Election (Presidential)', description: 'Vote for President, U.S. House, State Legislature, and local issues.' },
    
    // 2029
    { date: '2029-05-08', type: 'primary', title: 'Primary Election', description: 'Both parties choose candidates to represent them in the November General Election.' },
    { date: '2029-11-06', type: 'municipal', title: 'Hometown Election', description: 'Vote for Mayor, City Council members, School Board members, and local issues.' },
  ];

  // Build complete event list with deadlines
  const allEvents = [];
  
  // Add all elections
  elections.forEach(election => {
    allEvents.push(election);
    
    const electionDate = new Date(election.date);
    
    // Registration deadline (30 days before)
    const regDeadline = new Date(electionDate);
    regDeadline.setDate(regDeadline.getDate() - 30);
    allEvents.push({
      date: regDeadline.toISOString().split('T')[0],
      type: 'regDeadline',
      title: 'Voter Registration Deadline',
      description: `Last day to register to vote for the ${election.title}.`,
      parentElection: election.title
    });
    
    // Early voting begins (28 days before)
    const earlyVoting = new Date(electionDate);
    earlyVoting.setDate(earlyVoting.getDate() - 28);
    allEvents.push({
      date: earlyVoting.toISOString().split('T')[0],
      type: 'earlyVoting',
      title: 'Early Voting Begins',
      description: `Early in-person voting starts for the ${election.title}.`,
      parentElection: election.title
    });
    
    // Absentee ballot request deadline (7 days before)
    const absenteeDeadline = new Date(electionDate);
    absenteeDeadline.setDate(absenteeDeadline.getDate() - 7);
    allEvents.push({
      date: absenteeDeadline.toISOString().split('T')[0],
      type: 'absenteeDeadline',
      title: 'Absentee Ballot Request Deadline',
      description: `Last day to request an absentee ballot for the ${election.title}.`,
      parentElection: election.title
    });
  });

  // Sort all events by date
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  const startDate = new Date('2020-01-01');
  const endDate = new Date('2030-01-01');
  const today = new Date();

  // Find next upcoming election
  const upcomingElections = elections.filter(e => new Date(e.date) > today).sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextElection = upcomingElections[0];
  const daysUntilNext = nextElection ? Math.ceil((new Date(nextElection.date) - today) / (1000 * 60 * 60 * 24)) : null;

  const getPosition = (dateStr) => {
    const date = new Date(dateStr);
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const eventDays = (date - startDate) / (1000 * 60 * 60 * 24);
    return (eventDays / totalDays) * 100;
  };

  const todayPosition = getPosition(today.toISOString().split('T')[0]);

  const getColor = (type) => {
    switch(type) {
      case 'presidential': return '#9333ea';
      case 'general': return '#3b82f6';
      case 'municipal': return '#10b981';
      case 'primary': return '#60a5fa';
      case 'regDeadline': return '#dc2626';
      case 'absenteeDeadline': return '#dc2626';
      case 'earlyVoting': return '#10b981';
      default: return '#6b7280';
    }
  };

  const jumpToToday = () => {
    if (timelineRef.current) {
      const containerWidth = timelineRef.current.offsetWidth;
      const scrollPosition = (todayPosition / 100) * timelineRef.current.scrollWidth - containerWidth / 2;
      timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    jumpToToday();
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    timelineRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    timelineRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="w-full bg-white border-b-4 border-blue-600 shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
        <h2 className="text-lg font-bold">Montgomery County Elections Timeline</h2>
        <button
          onClick={jumpToToday}
          className="bg-white text-blue-600 px-3 py-1 rounded font-semibold text-sm hover:bg-blue-50"
        >
          Jump to Today
        </button>
      </div>

      {/* Timeline Container */}
      <div 
        ref={timelineRef}
        className="overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ height: '240px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <div className="relative" style={{ width: '16000px', height: '100%' }}>
          {/* Timeline base line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300" style={{ transform: 'translateY(-50%)' }} />

          {/* Year markers */}
          {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029].map(year => {
            const yearPos = getPosition(`${year}-01-01`);
            const yearString = year.toString();
            return (
              <div 
                key={year} 
                className="absolute bg-gray-300 z-0"
                style={{ 
                  left: `${yearPos}%`, 
                  width: '24px',
                  top: '0',
                  height: '100%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="flex flex-col items-center justify-around h-full text-white text-xs font-bold py-1">
                  <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yearString}</span>
                  <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yearString}</span>
                  <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{yearString}</span>
                </div>
              </div>
            );
          })}

          {/* Today marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-0"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold whitespace-nowrap">
              TODAY
            </div>
            {daysUntilNext && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold whitespace-nowrap text-center" style={{ lineHeight: '1.2' }}>
                {daysUntilNext} days until<br/>next election
              </div>
            )}
          </div>

          {/* Events - markers only */}
          {allEvents.map((event, idx) => {
            const pos = getPosition(event.date);
            const isElection = ['presidential', 'general', 'municipal', 'primary'].includes(event.type);
            const isEarlyVoting = event.type === 'earlyVoting';
            const isRegDeadline = event.type === 'regDeadline';
            const isAbsenteeDeadline = event.type === 'absenteeDeadline';
            const color = getColor(event.type);
            
            // Grid positioning - 3 rows below timeline
            let topPosition = '8%'; // default for elections
            if (isRegDeadline) topPosition = '58%'; // Row 1 - registration
            if (isEarlyVoting) topPosition = '68%'; // Row 2 - early voting
            if (isAbsenteeDeadline) topPosition = '78%'; // Row 3 - absentee
            
            return (
              <div
                key={`${event.date}-${event.type}-${idx}`}
                className="absolute cursor-pointer z-10"
                style={{ 
                  left: `${pos}%`, 
                  top: topPosition,
                  transform: 'translateX(-50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(selectedEvent?.date === event.date && selectedEvent?.title === event.title ? null : event);
                }}
              >
                {/* Event marker */}
                {isElection ? (
                  // Election date box - doubled size
                  <>
                    <div 
                      className="flex flex-col items-center justify-center rounded shadow-lg border-2 border-white"
                      style={{ 
                        backgroundColor: color,
                        width: '72px',
                        height: '72px',
                        color: 'white'
                      }}
                    >
                      <div className="text-xs font-bold leading-tight" style={{ fontSize: '22px' }}>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                      <div className="text-base font-bold leading-tight" style={{ fontSize: '32px' }}>{new Date(event.date).getDate()}</div>
                    </div>
                    <div 
                      className="w-0.5"
                      style={{ 
                        backgroundColor: color,
                        marginLeft: '35px',
                        marginTop: '-8px',
                        height: 'calc(100vh - 8%)'
                      }}
                    />
                  </>
                ) : isEarlyVoting ? (
                  // Green diamond - doubled size
                  <div className="relative" style={{ width: '56px', height: '56px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
                      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#10b981" stroke="white" strokeWidth="1"/>
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">!</text>
                    </svg>
                  </div>
                ) : (isRegDeadline || isAbsenteeDeadline) ? (
                  // Red diamond - doubled size
                  <div className="relative" style={{ width: '56px', height: '56px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
                      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#dc2626" stroke="white" strokeWidth="1"/>
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">!</text>
                    </svg>
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Popups - rendered separately on top, allowed to extend over map */}
          {selectedEvent && allEvents.map((event, idx) => {
            if (event.date !== selectedEvent.date || event.title !== selectedEvent.title) return null;
            
            const pos = getPosition(event.date);
            const isElection = ['presidential', 'general', 'municipal', 'primary'].includes(event.type);
            const isRegDeadline = event.type === 'regDeadline';
            const isEarlyVoting = event.type === 'earlyVoting';
            const isAbsenteeDeadline = event.type === 'absenteeDeadline';
            const color = getColor(event.type);
            
            let topPosition = '8%';
            if (isRegDeadline) topPosition = '58%';
            if (isEarlyVoting) topPosition = '68%';
            if (isAbsenteeDeadline) topPosition = '78%';
            
            // Calculate if popup would go off right edge
            const popupWidth = 224; // 56 * 4 = 224px (w-56)
            const timelineWidth = 16000;
            const positionPixels = (pos / 100) * timelineWidth;
            const halfPopup = popupWidth / 2;
            
            let adjustedLeft = '50%';
            let adjustedTransform = 'translateX(-50%)';
            
            // If popup would extend past right edge
            if (positionPixels + halfPopup > timelineWidth) {
              adjustedLeft = '100%';
              adjustedTransform = 'translateX(-100%)';
            }
            // If popup would extend past left edge
            else if (positionPixels - halfPopup < 0) {
              adjustedLeft = '0%';
              adjustedTransform = 'translateX(0%)';
            }
            
            return (
              <div
                key={`popup-${event.date}-${event.type}-${idx}`}
                className="absolute"
                style={{ 
                  left: `${pos}%`, 
                  top: topPosition,
                  transform: 'translateX(-50%)',
                  zIndex: 9999,
                  pointerEvents: 'none'
                }}
              >
                <div 
                  className="border-2 rounded-lg shadow-xl p-3 w-56"
                  style={{ 
                    backgroundColor: '#ffffff',
                    borderColor: color,
                    position: 'relative',
                    left: adjustedLeft,
                    transform: adjustedTransform,
                    top: '40px',
                    pointerEvents: 'auto'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(null);
                    }}
                    className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 text-lg leading-none font-bold"
                  >
                    ×
                  </button>
                  
                  <div className="text-xs text-gray-600 mb-1 pr-4">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="font-bold text-sm mb-1" style={{ color }}>{event.title}</div>
                  <div className="text-xs text-gray-700">{event.description}</div>
                  
                  {/* Add RESULTS REPORT for Nov 2023, 2024, 2025 */}
                  {event.showResults && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs font-bold text-gray-900">RESULTS REPORT</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
