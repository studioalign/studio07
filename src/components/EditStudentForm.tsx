import React, { useState } from 'react';
import { Save } from 'lucide-react';
import FormInput from './FormInput';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EmergencyContact {
  id?: string;
  student_id?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  doctor_name: string;
  doctor_phone: string;
  photo_consent: boolean;
  social_media_consent: boolean;
  participation_consent: boolean;
  emergency_contacts: EmergencyContact[];
}

interface EditStudentFormProps {
  student: Student;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditStudentForm({
  student,
  onSuccess,
  onCancel,
}: EditStudentFormProps) {
  const { profile } = useAuth();
  const [name, setName] = useState(student.name);
  const [dateOfBirth, setDateOfBirth] = useState(student.date_of_birth);
  const [gender, setGender] = useState(student.gender);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    student.emergency_contacts || [{
      name: "",
      relationship: "",
      phone: "",
      email: ""
    }]
  );
  const [medicalConditions, setMedicalConditions] = useState(student.medical_conditions || "");
  const [allergies, setAllergies] = useState(student.allergies || "");
  const [medications, setMedications] = useState(student.medications || "");
  const [doctorName, setDoctorName] = useState(student.doctor_name || "");
  const [doctorPhone, setDoctorPhone] = useState(student.doctor_phone || "");
  const [photoConsent, setPhotoConsent] = useState(student.photo_consent);
  const [socialMediaConsent, setSocialMediaConsent] = useState(student.social_media_consent);
  const [participationConsent, setParticipationConsent] = useState(student.participation_consent);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', relationship: '', phone: '', email: '' }
    ]);
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const updatedContacts = emergencyContacts.map((contact, i) => {
      if (i === index) {
        return { ...contact, [field]: value };
      }
      return contact;
    });
    setEmergencyContacts(updatedContacts);
  };

  const removeEmergencyContact = (index: number) => {
    if (emergencyContacts.length > 1) {
      setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!profile?.id) {
      setError("No parent ID found");
      setIsSubmitting(false);
      return;
    }

    // Get studio_id from the user's profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('studio_id')
      .eq('id', profile.id)
      .single();

    if (userError || !userData?.studio_id) {
      setError("Could not find studio information");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Update student data
      const { error: updateError } = await supabase
        .from('students')
        .update({
          studio_id: userData.studio_id,
          name,
          date_of_birth: dateOfBirth,
          gender,
          medical_conditions: medicalConditions,
          allergies,
          medications,
          doctor_name: doctorName,
          doctor_phone: doctorPhone,
          photo_consent: photoConsent,
          social_media_consent: socialMediaConsent,
          participation_consent: participationConsent,
        })
        .eq('id', student.id);

      if (updateError) throw updateError;

      // Step 2: Delete existing emergency contacts
      const { error: deleteError } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('student_id', student.id);

      if (deleteError) throw deleteError;

      // Step 3: Insert new emergency contacts
      for (const contact of emergencyContacts) {
        const { error: contactError } = await supabase
          .from('emergency_contacts')
          .insert([
            {
              student_id: student.id,
              name: contact.name,
              relationship: contact.relationship,
              phone: contact.phone,
              email: contact.email,
            },
          ]);

        if (contactError) throw contactError;
      }

      onSuccess();
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="name"
            type="text"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormInput
            id="dateOfBirth"
            type="date"
            label="Date of Birth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400">
            Gender
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-brand-primary">Emergency Contacts</h3>
          <button
            type="button"
            onClick={addEmergencyContact}
            className="text-sm text-brand-primary hover:text-brand-secondary-400"
          >
            + Add another contact
          </button>
        </div>
        
        {emergencyContacts.map((contact, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-brand-secondary-400">
                Emergency Contact {index + 1}
              </h4>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeEmergencyContact(index)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id={`contact-name-${index}`}
                type="text"
                label="Contact Name"
                value={contact.name}
                onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                required
              />
              <FormInput
                id={`contact-relationship-${index}`}
                type="text"
                label="Relationship to Student"
                value={contact.relationship}
                onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                required
              />
              <FormInput
                id={`contact-phone-${index}`}
                type="tel"
                label="Phone Number"
                value={contact.phone}
                onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                required
              />
              <FormInput
                id={`contact-email-${index}`}
                type="email"
                label="Email Address"
                value={contact.email}
                onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                required
              />
            </div>
          </div>
        ))}
      </div>

      {/* Medical Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Medical Information</h3>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400">
            Medical Conditions
          </label>
          <textarea
            value={medicalConditions}
            onChange={(e) => setMedicalConditions(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            placeholder="Please list any medical conditions we should be aware of"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400">
            Allergies
          </label>
          <textarea
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            placeholder="Please list any allergies"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400">
            Current Medications
          </label>
          <textarea
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            placeholder="Please list any medications your child is currently taking"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="doctorName"
            type="text"
            label="Doctor's Name"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
          <FormInput
            id="doctorPhone"
            type="tel"
            label="Doctor's Phone"
            value={doctorPhone}
            onChange={(e) => setDoctorPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Consents */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Consents</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="photoConsent"
                type="checkbox"
                checked={photoConsent}
                onChange={(e) => setPhotoConsent(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="photoConsent" className="text-sm text-gray-700">
                I consent to photos and videos being taken of my child for promotional purposes
              </label>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="socialMediaConsent"
                type="checkbox"
                checked={socialMediaConsent}
                onChange={(e) => setSocialMediaConsent(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="socialMediaConsent" className="text-sm text-gray-700">
                I consent to photos and videos being used on social media
              </label>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="participationConsent"
                type="checkbox"
                checked={participationConsent}
                onChange={(e) => setParticipationConsent(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
                required
              />
            </div>
            <div className="ml-3">
              <label htmlFor="participationConsent" className="text-sm text-gray-700">
                I confirm that my child is physically fit to participate in
                dance classes and I will inform the studio of any changes to
                their health condition
              </label>
              <p className="mt-1 text-xs text-gray-500">
                This consent is required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Handling */}
      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-white rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent focus:ring-2 focus:ring-brand-primary flex items-center"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
          <Save className="inline-block ml-2 w-4 h-4" />
        </button>
      </div>
    </form>
  );
}