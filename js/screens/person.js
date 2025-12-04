/**
 * IPTV Player - Person Screen Extensions
 * Additional functionality for person modal
 */

// This file extends the modal.js functionality for person details

/**
 * Render person details with extended info
 */
async function renderPersonExtended(personData, container) {
    // Additional person info
    let infoHtml = '';

    if (personData.birthday) {
        const age = calculateAge(personData.birthday, personData.deathday);
        infoHtml += `<span>🎂 ${formatDate(personData.birthday)}${age ? ` (${age} anos)` : ''}</span>`;
    }

    if (personData.placeOfBirth) {
        infoHtml += `<span>📍 ${personData.placeOfBirth}</span>`;
    }

    if (personData.deathday) {
        infoHtml += `<span>✝️ ${formatDate(personData.deathday)}</span>`;
    }

    if (infoHtml) {
        const detailsContainer = container.querySelector('.person-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = infoHtml;
        }
    }

    // Known for
    if (personData.knownFor) {
        const nameContainer = container.querySelector('.person-name');
        if (nameContainer) {
            nameContainer.innerHTML += `<span style="display:block;font-size:14px;color:var(--text-secondary);margin-top:4px">${getKnownForLabel(personData.knownFor)}</span>`;
        }
    }
}

/**
 * Calculate age
 */
function calculateAge(birthday, deathday) {
    if (!birthday) return null;

    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();

    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Format date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Get known for label
 */
function getKnownForLabel(knownFor) {
    const labels = {
        'Acting': 'Ator/Atriz',
        'Directing': 'Diretor(a)',
        'Writing': 'Roteirista',
        'Production': 'Produtor(a)',
        'Camera': 'Cinematografia',
        'Editing': 'Edição',
        'Sound': 'Som',
        'Art': 'Direção de Arte',
        'Costume & Make-Up': 'Figurino',
        'Crew': 'Equipe Técnica',
        'Visual Effects': 'Efeitos Visuais',
        'Lighting': 'Iluminação'
    };

    return labels[knownFor] || knownFor;
}

// Export
window.renderPersonExtended = renderPersonExtended;
