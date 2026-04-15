import { api } from '@/lib/api';

export async function changePassword(params: { oldPassword: string; newPassword: string }): Promise<void> {
  await api.put('/user/changePassword', params);
}
