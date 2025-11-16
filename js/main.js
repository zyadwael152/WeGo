
document.addEventListener('DOMContentLoaded', () => {
    renderMockData();
});

/**
@function renderMockData */

async function renderMockData(){

    const gridContainer = document.getElementById('destination-grid');

    if (!gridContainer){
        console.error("Error: Could not find element with id 'destination-grid'");
        return; 
    }

    try{
        const response = await fetch('data/mock.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const destinations = await response.json();

        gridContainer.innerHTML = ''; 

        destinations.forEach(dest => {
            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = `
                <img src="${dest.img}" alt="${dest.name}">
                <div class="body">
                    <h3>${dest.name}</h3>
                    <p>${dest.desc}</p>
                </div>
            `;
            card.innerHTML = cardContent;
            gridContainer.appendChild(card);
        });

    } 
    catch (error){
        console.error('Failed to fetch mock data:', error);
        gridContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading destinations. Please try again later.</p>';
    }
}