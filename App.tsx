import React, { useState } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Button } from './components/Button';
import { ContainerType, MatterState, ContainerData } from './types';

// Initial Containers
const INITIAL_CONTAINERS: ContainerData[] = [
  { id: 1, type: ContainerType.CUBE, matter: MatterState.EMPTY, label: 'Cube Box' },
  { id: 2, type: ContainerType.CYLINDER, matter: MatterState.EMPTY, label: 'Tall Jar' },
  { id: 3, type: ContainerType.SPHERE, matter: MatterState.EMPTY, label: 'Round Bowl' },
];

const FACTS = {
  [MatterState.EMPTY]: "Click a container to select it, then choose a material to fill it!",
  [MatterState.SOLID]: "Solids keep their shape! The rock stays the same shape no matter which container it is in.",
  [MatterState.LIQUID]: "Liquids flow! Water takes the shape of the container but stays at the bottom.",
  [MatterState.GAS]: "Gases expand! The smoke spreads out to fill the whole container completely.",
};

const App: React.FC = () => {
  const [containers, setContainers] = useState<ContainerData[]>(INITIAL_CONTAINERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleSelectContainer = (id: number) => {
    setSelectedId(id);
  };

  const handleSetMatter = (matter: MatterState) => {
    if (selectedId === null) {
      alert("Please click a container first!");
      return;
    }

    setContainers(prev => prev.map(c => 
      c.id === selectedId ? { ...c, matter } : c
    ));
  };

  const selectedContainer = containers.find(c => c.id === selectedId);
  const currentFact = selectedContainer ? FACTS[selectedContainer.matter] : FACTS[MatterState.EMPTY];

  return (
    <div className="min-h-screen flex flex-col items-center bg-sky-50 text-slate-800">
      {/* Header */}
      <header className="w-full bg-white shadow-md py-3 px-4 md:py-4 md:px-6 flex justify-between items-center z-10 sticky top-0">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-blue-600 font-['Comic_Neue'] tracking-wide truncate">
          ⚗️ States of Matter Lab
        </h1>
        <div className="text-xs md:text-sm text-gray-500 hidden sm:block whitespace-nowrap ml-4">
          Grade 3 Science Explorer
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl p-2 md:p-4 flex flex-col gap-4 md:gap-6">
        
        {/* Info Banner */}
        <div className={`
          rounded-2xl p-4 md:p-6 shadow-sm border-l-8 transition-all duration-500
          ${!selectedContainer ? 'bg-white border-gray-300' : ''}
          ${selectedContainer?.matter === MatterState.SOLID ? 'bg-stone-100 border-stone-500' : ''}
          ${selectedContainer?.matter === MatterState.LIQUID ? 'bg-blue-100 border-blue-500' : ''}
          ${selectedContainer?.matter === MatterState.GAS ? 'bg-red-50 border-red-500' : ''}
        `}>
          <h2 className="text-lg md:text-2xl font-bold mb-1 md:mb-2 flex items-center gap-2">
             <span className="text-xl md:text-2xl">💡</span> 
             {selectedContainer 
               ? `Selected: ${selectedContainer.label}` 
               : 'Instructions'}
          </h2>
          <p className="text-base md:text-xl leading-relaxed text-slate-700">
            {currentFact}
          </p>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl border-4 border-slate-200 overflow-hidden relative min-h-[35vh] md:min-h-[400px]">
          <SimulationCanvas 
            containers={containers} 
            selectedId={selectedId} 
            onSelect={handleSelectContainer} 
          />
          
          {/* Helper overlay if nothing selected */}
          {!selectedId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-3 py-1 md:px-4 md:py-2 text-sm md:text-base rounded-full font-bold shadow-md animate-pulse pointer-events-none whitespace-nowrap">
              👆 Click a container!
            </div>
          )}
        </div>

        {/* Controls - Grid that stays in one row on mobile if possible, or wraps nicely */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 pb-4 md:pb-8">
          <Button
            label="Solid"
            onClick={() => handleSetMatter(MatterState.SOLID)}
            colorClass="bg-stone-500 hover:bg-stone-600"
            icon="🪨"
            disabled={!selectedId}
          />
          <Button
            label="Liquid"
            onClick={() => handleSetMatter(MatterState.LIQUID)}
            colorClass="bg-blue-500 hover:bg-blue-600"
            icon="💧"
            disabled={!selectedId}
          />
          <Button
            label="Gas"
            onClick={() => handleSetMatter(MatterState.GAS)}
            colorClass="bg-red-500 hover:bg-red-600"
            icon="💨"
            disabled={!selectedId}
          />
        </div>
      </main>
    </div>
  );
};

export default App;