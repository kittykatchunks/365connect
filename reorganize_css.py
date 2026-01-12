#!/usr/bin/env python3
"""
CSS Reorganization Script for phone_v2.css
Reorganizes CSS based on PHONE_CSS_USAGE.md structure
"""

import re
from pathlib import Path

# Read the original CSS file
css_file = Path(r"C:\Users\james\Visual Studio Code\Connect365\Connect365\pwa\css\phone_v2.css.backup")
output_file = Path(r"C:\Users\james\Visual Studio Code\Connect365\Connect365\pwa\css\phone_v2.css")

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract sections
def extract_between(text, start, end):
    """Extract text between start and end markers"""
    try:
        start_idx = text.index(start)
        end_idx = text.index(end, start_idx + len(start))
        return text[start_idx:end_idx + len(end)]
    except ValueError:
        return None

# Extract header
header_end = content.index(':root {')
header = content[:header_end].strip()

# Extract CSS variables and theme sections
variables_start = content.index(':root {')
variables_end = content.index('/* ===== BASE STYLES ===== */')
variables_section = content[variables_start:variables_end].strip()

# Extract base styles
base_start = content.index('/* ===== BASE STYLES ===== */')
base_end = content.index('/* ===== LAYOUT COMPONENTS ===== */')
base_styles = content[base_start:base_end].strip()

# Now we need to reorganize the rest by sections
# This will be done by selector mapping

# Create output with organized sections
output = f"""{header}

{variables_section}

{base_styles}

/* ===== BUTTON SYSTEM ===== */

button {{
    margin: 0;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-color);
    /* border-radius: var(--border-radius); */
    min-width: 30px;
    min-height: 30px;
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: var(--theme-transition);
    background-color: var(--surface-color);
    color: var(--text-color);
}}

button:hover:not(:disabled) {{
    background-color: var(--surface-color-hover);
    transform: translateY(-1px);
    box-shadow: var(--box-shadow);
}}

button:active:not(:disabled) {{
    transform: translateY(0);
    box-shadow: none;
}}

button:disabled {{
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}}

button:focus {{
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.25);
}}

/* Button Variants */
.btn-primary {{
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
}}

.btn-primary:hover:not(:disabled) {{
    background-color: var(--primary-color);
    opacity: 0.9;
}}

.btn-secondary {{
    background-color: var(--secondary-color);
    border-color: var(--secondary-color);
    color: white;
}}

.btn-success {{
    background-color: var(--success-color);
    border-color: var(--success-color);
    color: white;
}}

.btn-success:hover {{
    background-color: var(--success-color);
    border-color: var(--success-color);
    opacity: 1.4;
    color: white;
}}

.btn-danger {{
    background-color: var(--danger-color);
    border-color: var(--danger-color);
    color: white;
}}

.btn-danger:hover {{
    background-color: var(--danger-color);
    border-color: var(--danger-color);
    opacity: 1.4;
    color: white;
}}

.btn-warning {{
    background-color: var(--warning-color);
    border-color: var(--warning-color);
    color: white;
}}

/* ===== FORM ELEMENTS ===== */

input[type="text"],
input[type="password"],
input[type="email"],
input[type="tel"],
input[type="number"],
select,
textarea {{
    font-size: var(--font-size-md);
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    /* border-radius: var(--border-radius); */
    background-color: var(--surface-color);
    color: var(--text-color);
    transition: var(--theme-transition);
    width: 100%;
}}

input:focus,
select:focus,
textarea:focus {{
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.25);
    background-color: var(--background-color);
}}

/* Custom Select Arrow */
select {{
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj48cGF0aCBkPSJNMzEuMyAxOTJoMjU3LjNjMTcuOCAwIDI2LjcgMjEuNSAxNC4xIDM0LjFMMTc0LjEgMzU0LjhjLTcuOCA3LjgtMjAuNSA3LjgtMjguMyAwTDE3LjIgMjI2LjFDNC42IDIxMy41IDEzLjUgMTkyIDMxLjMgMTkyeiIgZmlsbD0iIzQxNjQ5MyIvPjwvc3ZnPg==');
    background-size: 10px;
    background-position: center right var(--spacing-sm);
    background-repeat: no-repeat;
    padding-right: var(--spacing-lg);
    cursor: pointer;
}}

/* ===== CUSTOM CHECKBOXES ===== */

input[type="checkbox"] {{
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    /* border-radius: 3px; */
    background-color: var(--background-color);
    position: relative;
    cursor: pointer;
    transition: var(--theme-transition);
    margin-right: var(--spacing-sm);
}}

input[type="checkbox"]:checked {{
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}}

input[type="checkbox"]:checked::after {{
    content: '✓';
    position: absolute;
    color: white;
    font-size: 12px;
    font-weight: bold;
    top: -2px;
    left: 2px;
}}

/* ====================================================================================== */
/* SECTION: index.html */
/* ====================================================================================== */
"""

# Continue with the rest of the CSS...
# This approach is getting complex. Let me use a simpler direct replacement

print("Script created. The full reorganization is complex and will be done via direct file editing.")
