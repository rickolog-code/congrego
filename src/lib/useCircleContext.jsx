import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const CircleContext = createContext(null);

export function CircleProvider({ children }) {
  const [activeCircleId, setActiveCircleId] = useState(
    localStorage.getItem('activeCircleId') || null
  );
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Single query: load memberships + their circles together
  const { data, refetch } = useQuery({
    queryKey: ['my-circles-full', user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.CircleMember.filter({ user_email: user.email });
      if (memberships.length === 0) return { memberships: [], circles: [] };
      const circles = await Promise.all(
        memberships.map(m =>
          base44.entities.Circle.filter({ id: m.circle_id })
            .then(r => r[0])
            .catch(() => null)
        )
      );
      return { memberships, circles: circles.filter(Boolean) };
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  const memberships = data?.memberships || [];
  const circles = data?.circles || [];

  useEffect(() => {
    if (circles.length > 0) {
      const stillValid = circles.some(c => c.id === activeCircleId);
      if (!stillValid) {
        setActiveCircleId(circles[0].id);
      }
    }
  }, [circles.length, activeCircleId]);

  useEffect(() => {
    if (activeCircleId) {
      localStorage.setItem('activeCircleId', activeCircleId);
    }
  }, [activeCircleId]);

  const activeCircle = circles.find(c => c.id === activeCircleId) || null;
  const myMembership = memberships.find(m => m.circle_id === activeCircleId) || null;

  const switchCircle = (id) => setActiveCircleId(id);

  const refreshCircles = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-circles-full', user?.email] });
    await refetch();
  };

  return (
    <CircleContext.Provider value={{
      user,
      circles,
      activeCircle,
      activeCircleId,
      myMembership,
      memberships,
      switchCircle,
      refreshCircles,
    }}>
      {children}
    </CircleContext.Provider>
  );
}

export function useCircle() {
  return useContext(CircleContext);
}