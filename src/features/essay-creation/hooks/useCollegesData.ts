// Hook for managing colleges and programmes data
import { useState, useEffect } from 'react';
import { collegesService } from '@/services/colleges.service';
import type { College, Programme } from '@/types/entities';

interface UseCollegesDataResult {
  colleges: College[];
  programmes: Programme[];
  loading: boolean;
  selectedCountry: string;
  collegeId: string;
  programmeId: string;
  isCustomCollege: boolean;
  customCollegeName: string;
  customProgrammeName: string;
  setSelectedCountry: (country: string) => void;
  setCollegeId: (id: string) => void;
  setProgrammeId: (id: string) => void;
  setIsCustomCollege: (isCustom: boolean) => void;
  setCustomCollegeName: (name: string) => void;
  setCustomProgrammeName: (name: string) => void;
}

export const useCollegesData = (): UseCollegesDataResult => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [collegeId, setCollegeId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [customProgrammeName, setCustomProgrammeName] = useState('');

  // Fetch colleges when country changes
  useEffect(() => {
    const fetchColleges = async () => {
      setLoading(true);
      const result = await collegesService.listColleges(selectedCountry);
      
      if (result.success) {
        setColleges(result.data);
      }
      setLoading(false);
    };

    fetchColleges();
  }, [selectedCountry]);

  // Fetch programmes when college changes
  useEffect(() => {
    const fetchProgrammes = async () => {
      if (!collegeId) {
        setProgrammes([]);
        return;
      }

      setLoading(true);
      const result = await collegesService.listProgrammes(collegeId);
      
      if (result.success) {
        setProgrammes(result.data);
      }
      setLoading(false);
    };

    fetchProgrammes();
  }, [collegeId]);

  return {
    colleges,
    programmes,
    loading,
    selectedCountry,
    collegeId,
    programmeId,
    isCustomCollege,
    customCollegeName,
    customProgrammeName,
    setSelectedCountry,
    setCollegeId,
    setProgrammeId,
    setIsCustomCollege,
    setCustomCollegeName,
    setCustomProgrammeName,
  };
};
