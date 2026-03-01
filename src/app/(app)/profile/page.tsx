'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import ProfileForm from '@/components/profile/ProfileForm';
import InjuryTags from '@/components/profile/InjuryTags';
import GoalEditor from '@/components/profile/GoalEditor';
import EquipmentPicker from '@/components/profile/EquipmentPicker';
import Spinner from '@/components/ui/Spinner';

interface FullProfile {
  id: string;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  fitnessLevel: string;
  notes: string | null;
  injuries: { id: string; description: string; tag: string; active: boolean }[];
  goals: {
    id: string; type: string; title: string;
    targetDate: string | null; seasonStart: string | null;
    seasonEnd: string | null; active: boolean;
  }[];
  equipmentItems: { id: string; name: string; category: string | null; notes: string | null }[];
  gymMemberships: {
    id: string; gymName: string; address: string | null;
    equipment: string | null; active: boolean;
  }[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/profile');
    const data = await res.json() as FullProfile | null;
    setProfile(data ?? {
      id: '', age: null, weightKg: null, heightCm: null,
      fitnessLevel: 'BEGINNER', notes: null,
      injuries: [], goals: [], equipmentItems: [], gymMemberships: [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveProfile(data: {
    age: number | null; weightKg: number | null;
    heightCm: number | null; fitnessLevel: string; notes: string | null;
  }) {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await loadProfile();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Health Profile</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initial={{
                age:          profile!.age,
                weightKg:     profile!.weightKg,
                heightCm:     profile!.heightCm,
                fitnessLevel: profile!.fitnessLevel,
                notes:        profile!.notes,
              }}
              onSave={saveProfile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Injuries & Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <InjuryTags
              injuries={profile!.injuries}
              profileId={profile!.id}
              onUpdate={loadProfile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalEditor
              goals={profile!.goals}
              onUpdate={loadProfile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentPicker
              equipment={profile!.equipmentItems}
              gyms={profile!.gymMemberships}
              onUpdate={loadProfile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
