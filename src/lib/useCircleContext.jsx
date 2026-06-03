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

  const { data: memberships = [], isLoading: membershipsLoading, isFetching: membershipsFetching } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CircleMember.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const circleIds = memberships.map(m => m.circle_id);

  const { data: circles = [], isLoading: circlesLoading } = useQuery({
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

  // True while we don't yet know if the user has circles.
  // Use isFetching (not just isLoading) so we cover background refetches after leave/join.
  const isLoadingCircles =
    !user ||
    membershipsLoading ||
    membershipsFetching ||
    (circleIds.length > 0 && circlesLoading);

  // Backfill circle_ids / hosted_circle_ids on the User record if missing (for existing users)
  useEffect(() => {
    if (!user || membershipsLoading || memberships.length === 0) return;
    const memberCircleIds = memberships.map(m => m.circle_id);
    const hostedCircleIds = memberships.filter(m => m.role === 'host').map(m => m.circle_id);
    const existingIds = user.circle_ids || [];
    const existingHostedIds = user.hosted_circle_ids || [];
    const needsUpdate =
      memberCircleIds.some(id => !existingIds.includes(id)) ||
      hostedCircleIds.some(id => !existingHostedIds.includes(id));
    if (needsUpdate) {
      base44.auth.updateMe({
        circle_ids: [...new Set([...existingIds, ...memberCircleIds])],
        hosted_circle_ids: [...new Set([...existingHostedIds, ...hostedCircleIds])],
      }).then(setUser).catch(() => {});
    }
  }, [user, memberships, membershipsLoading]);

  useEffect(() => {
    // Don't update active circle while data is still in flight
    if (membershipsLoading || membershipsFetching) return;
    if (circles.length > 0) {
      const stillValid = circles.some(c => c.id === activeCircleId);
      if (!stillValid) {
        setActiveCircleId(circles[0].id);
      }
    } else if (circleIds.length === 0) {
      // User has no memberships — clear the active circle
      setActiveCircleId(null);
      localStorage.removeItem('activeCircleId');
    }
  }, [circles, activeCircleId, membershipsLoading, membershipsFetching, circleIds.length]);

  useEffect(() => {
    if (activeCircleId) {
      localStorage.setItem('activeCircleId', activeCircleId);
    }
  }, [activeCircleId]);

  const activeCircle = circles.find(c => c.id === activeCircleId) || null;
  const myMembership = memberships.find(m => m.circle_id === activeCircleId) || null;

  const switchCircle = (id) => setActiveCircleId(id);

  const refreshCircles = () => {
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    queryClient.invalidateQueries({ queryKey: ['my-circles'] });
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
      isLoadingCircles,
      membershipsFetching,
    }}>
      {children}
    </CircleContext.Provider>
  );
}

export function useCircle() {
  return useContext(CircleContext);
}