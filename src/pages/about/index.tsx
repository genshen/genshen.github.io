/**
 * Copyright (c) 2018-present, genshen.
 *
 */

import React, {useEffect} from 'react';
import Layout from '@theme/Layout';

function About() {

  return (
    <Layout>
      <h1 className="container margin-vert--xl">About Page</h1>
      <div className="container">
        <a href="https://github.com/genshen" target="_blank"> Follow me on Github</a>
        <p>A Student in Computer Science</p>
      </div>
    </Layout>
  );
}

export default About;
