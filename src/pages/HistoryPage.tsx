import TripHistory from '@/components/TripHistory';
import CollisionHistory from '@/components/CollisionHistory';

const HistoryPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold font-mono gradient-text mb-2">History</h1>
        <p className="text-muted-foreground text-sm md:text-base">View your trip and collision history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <TripHistory />
        <CollisionHistory />
      </div>
    </div>
  );
};

export default HistoryPage;
