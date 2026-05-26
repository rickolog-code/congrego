import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const CircleContext = createContext(null);

export function CircleProvider({ children }) {
  const [activeCircleId, setActiveCircleId] = useState(
    localStorage.getItem('activeCircleId') || null
  );
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [circles, setCircles] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadCircles = useCallback(async (userEmail) => {
    if (!userEmail) return;
    const mems = await base44.entities.CircleMember.filter({ user_email: userEmail });
    setMemberships(mems);
    if (mems.length === 0) {
      setCircles([]);
      return;
    }
    const fetched = await Promise.all(
      mems.map(m =>
        base44.entities.Circle.filter({ id: m.circle_id })
          .then(r => r[0])
          .catch(() => null)
      )
    );
    setCircles(fetched.filter(Boolean));
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadCircles(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (circles.length > 0) {
      const stillValid = circles.some(c => c.id === activeCircleId);
      if (!stillValid) {
        const newId = circles[0].id;
        setActiveCircleId(newId);
        localStorage.setItem('activeCircleId', newId);
      }
    }
  }, [circles]);

  useEffect(() => {
    if (activeCircleId) {
      localStorage.setItem('activeCircleId', activeCircleId);
    }
  }, [activeCircleId]);

  const activeCircle = circles.find(c => c.id === activeCircleId) || null;
  const myMembership = memberships.find(m => m.circle_id === activeCircleId) || null;

  const switchCircle = (id) => setActiveCircleId(id);

  const refreshCircles = async () => {
    await loadCircles(user?.email);
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
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