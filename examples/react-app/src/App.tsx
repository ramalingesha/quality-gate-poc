import { useState } from 'react';

import styles from './App.module.css';

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page} data-quality-ready="true">
      <header className={styles.header}>
        <a className={styles.brand} href="#home" aria-label="Acme home">Acme</a>
        <div className={styles.accountArea}>
          <div className={styles.avatar} data-testid="user-avatar" aria-hidden="true">RL</div>
          <button
            type="button"
            className={styles.trigger}
            data-testid="account-menu-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="account-menu"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            Account
            <span aria-hidden="true">⌄</span>
          </button>
          {menuOpen && (
            <nav id="account-menu" className={styles.menu} data-testid="account-menu" aria-label="Account menu">
              <a href="#profile">Profile</a>
              <a href="#settings">Settings</a>
              <a href="#sign-out">Sign out</a>
            </nav>
          )}
        </div>
      </header>
      <section className={styles.content} aria-labelledby="page-title">
        <p className={styles.eyebrow}>React consumer</p>
        <h1 id="page-title">A small UI with a shared quality contract.</h1>
        <p>The markup is React-specific; the runner only sees the adapter’s logical names.</p>
      </section>
    </main>
  );
}
