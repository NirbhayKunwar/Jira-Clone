import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../../config/api';

export const useMemberProfile = (memberId) => {
  return useQuery({
    queryKey: ['member-profile', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const res = await fetch(`${API_URL}/api/members/${memberId}/profile`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch member profile');
      const json = await res.json();
      return json.data;
    },
    enabled: !!memberId
  });
};
