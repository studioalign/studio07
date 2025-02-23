import React from 'react';
import { X, Phone, Mail, AlertCircle } from 'lucide-react';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface StudentDetails {
  id: string;
  name: string;
  date_of_birth: string;  // Changed from dateOfBirth
  gender: string;
  emergency_contacts: EmergencyContact[];  // Changed from emergencyContacts
  medical_conditions: string;  // Changed from medicalConditions
  allergies: string;
  medications: string;
  doctor_name: string;  // Changed from doctorName
  doctor_phone: string;  // Changed from doctorPhone
  photo_consent: boolean;  // Changed from photoConsent
  social_media_consent: boolean;  // Changed from socialMediaConsent
  participation_consent: boolean;  // Changed from participationConsent
}

interface StudentDetailsModalProps {
  student: StudentDetails;
  onClose: () => void;
}

export default function StudentDetailsModal({ student, onClose }: StudentDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-brand-primary">{student.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-semibold text-brand-primary mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-brand-secondary-400">Date of Birth</label>
                <p className="mt-1">{new Date(student.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-secondary-400">Gender</label>
                <p className="mt-1 capitalize">{student.gender}</p>
              </div>
            </div>
          </section>

          {/* Emergency Contacts */}
          <section>
            <h3 className="text-lg font-semibold text-brand-primary mb-4">Emergency Contacts</h3>
            <div className="space-y-4">
              {student.emergency_contacts.map((contact, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-brand-secondary-400">
                        {contact.name}
                      </h4>
                      <p className="text-sm text-gray-600">{contact.relationship}</p>
                    </div>
                    <div className="space-y-1">
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center text-sm text-brand-primary hover:text-brand-secondary-400"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        {contact.phone}
                      </a>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center text-sm text-brand-primary hover:text-brand-secondary-400"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        {contact.email}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Medical Information */}
          <section>
            <h3 className="text-lg font-semibold text-brand-primary mb-4">Medical Information</h3>
            
            {/* Alert for Medical Conditions */}
            {(student.medical_conditions || student.allergies) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Medical Alert</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This student has medical conditions or allergies that require attention.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {student.medical_conditions && (
                <div>
                  <label className="text-sm font-medium text-brand-secondary-400">
                    Medical Conditions
                  </label>
                  <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3">
                    {student.medical_conditions}
                  </p>
                </div>
              )}
              
              {student.allergies && (
                <div>
                  <label className="text-sm font-medium text-brand-secondary-400">
                    Allergies
                  </label>
                  <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3">
                    {student.allergies}
                  </p>
                </div>
              )}
              
              {student.medications && (
                <div>
                  <label className="text-sm font-medium text-brand-secondary-400">
                    Current Medications
                  </label>
                  <p className="mt-1 text-gray-700 bg-gray-50 rounded-lg p-3">
                    {student.medications}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-brand-secondary-400">
                    Doctor's Name
                  </label>
                  <p className="mt-1">{student.doctor_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary-400">
                    Doctor's Phone
                  </label>
                  <p className="mt-1">
                    <a
                      href={`tel:${student.doctor_phone}`}
                      className="text-brand-primary hover:text-brand-secondary-400"
                    >
                      {student.doctor_phone}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Consents */}
          <section>
            <h3 className="text-lg font-semibold text-brand-primary mb-4">Consents</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-sm mr-3 flex items-center justify-center ${
                  student.photo_consent ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white text-xs">
                    {student.photo_consent ? '✓' : '✕'}
                  </span>
                </div>
                <span className="text-sm text-gray-700">
                  Photography consent during classes and performances
                </span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-sm mr-3 flex items-center justify-center ${
                  student.social_media_consent ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white text-xs">
                    {student.social_media_consent ? '✓' : '✕'}
                  </span>
                </div>
                <span className="text-sm text-gray-700">
                  Social media usage consent
                </span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-sm mr-3 flex items-center justify-center ${
                  student.participation_consent ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white text-xs">
                    {student.participation_consent ? '✓' : '✕'}
                  </span>
                </div>
                <span className="text-sm text-gray-700">
                  Participation fitness confirmation
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}