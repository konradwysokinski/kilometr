import black from '../assets/strava/powered-by-strava-black.svg';
import white from '../assets/strava/powered-by-strava-white.svg';
import s from './PoweredByStrava.module.css';

/**
 * Strava's "Powered by Strava" mark, required wherever their data is shown
 * (developers.strava.com/guidelines). Their artwork, unaltered; kept small and
 * quiet so it reads below Kilometr's own name. Black in light mode, white in dark.
 */
export function PoweredByStrava({ className = '' }: { className?: string }) {
  return (
    <span className={`${s.mark} ${className}`}>
      <img className={s.light} src={black} alt="Powered by Strava" width={118} height={12} />
      {/* Only the one on show is read out: the other is display: none. */}
      <img className={s.dark} src={white} alt="Powered by Strava" width={118} height={12} />
    </span>
  );
}
