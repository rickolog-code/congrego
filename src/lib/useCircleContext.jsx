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

  const { data: memberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CircleMember.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const circleIds = memberships.map(m => m.circle_id);

  const { data: circles = [] } = useQuery({
    queryKey: ['my-circles', circleIds.join(',')],
    queryFn: async () => {
      if (circleIds.length === 0) return [];
      const all = await Promise.all(
        circleIds.map(id => base44.entities.Circle.filter({ id }).then(r => r[0]).catch(() => null))
      );
      return all.filter(Boolean);
    },
    enabled: circleIds.length > 0,
  });

  useEffect(() => {
    if (circles.length > 0) {
      const stillValid = circles.some(c => c.id === activeCircleId);
      if (!stillValid) {
        setActiveCircleId(circles[0].id);
      }
    }
  }, [circles, activeCircleId]);

  useEffect(() => {
    if (activeCircleId) {
      localStorage.setItem('activeCircleId', activeCircleId);
    }
  }, [activeCircleId]);

  const activeCircle = circles.find(c => c.id === activeCircleId) || null;
  const myMembership = memberships.find(m => m.circle_id === activeCircleId) || null;

  const switchCircle = (id) => setActiveCircleId(id);

  const refreshCircles = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-memberships', user?.email] });
    await queryClient.refetchQueries({ queryKey: ['my-memberships', user?.email] });
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