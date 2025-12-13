import Image from 'next/image';
import recordTechLogo from '../../../public/logo.png';
import { useTheme } from '@mui/material/styles';

export default function RecordTechIcon({ width = 35, height = 35, className = '' }) {
  return (
    <Image src={recordTechLogo} alt="Record Tech Icon" width={width} height={height} className={className} />
  );
}
