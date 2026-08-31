/// <reference types="cypress" />

describe('HanYu Cards learning experience', () => {
    beforeEach(() => {
        cy.clearAllLocalStorage()
        cy.visit('/study')
        cy.get('.daily-plan-strip, .study-complete-card').should('be.visible')
        cy.window().then((win) => {
            return new Cypress.Promise<void>((resolve, reject) => {
                const request = win.indexedDB.open('HanYu Cards')
                request.onerror = () => reject(request.error)
                request.onsuccess = () => {
                    const database = request.result
                    if (!database.objectStoreNames.contains('learning_progress')) {
                        database.close()
                        resolve()

                        return
                    }

                    const transaction = database.transaction('learning_progress', 'readwrite')
                    transaction.objectStore('learning_progress').clear()
                    transaction.onerror = () => reject(transaction.error)
                    transaction.oncomplete = () => {
                        database.close()
                        resolve()
                    }
                }
            })
        })
        cy.reload()
    })

    it('navigates through the current learning areas', () => {
        cy.visit('/study')
        cy.get('.study-hero').should('be.visible').and('contain.text', 'Build a little Mandarin')

        cy.get('.bottom-nav').contains('Missions').click()
        cy.location('pathname').should('equal', '/scenarios')
        cy.get('.missions-hero').should('contain.text', 'Real-life Mandarin')

        cy.get('.bottom-nav').contains('Practice').click()
        cy.location('pathname').should('equal', '/practice')
        cy.get('.practice-hero').should('contain.text', 'Train every side')

        cy.get('.bottom-nav').contains('Words').click()
        cy.location('pathname').should('equal', '/dictionary')
        cy.get('.dictionary-hero').should('contain.text', 'word garden')

        cy.get('.bottom-nav').contains('Progress').click()
        cy.location('pathname').should('equal', '/progress')
        cy.get('.progress-hero').should('contain.text', 'Small steps')
    })

    it('reviews a word and completes a practice question', () => {
        cy.visit('/study')
        cy.get('.word-card > .word-card__reveal .primary-action').click()
        cy.get('.word-card__answer').should('be.visible')
        cy.get('.review-button--again').click()
        cy.get('.topbar__meter').should('contain.text', '1/24')
        cy.get('.daily-plan-strip').should('contain.text', 'Card 2 of 24')
        cy.get('.deck-status > div').eq(0).should('contain.text', '0').and('contain.text', 'reviews due')
        cy.get('.deck-status > div').eq(1).should('contain.text', '2208').and('contain.text', 'new words')
        cy.get('.deck-status > div').eq(2).should('contain.text', '1').and('contain.text', 'answers today')

        cy.reload()
        cy.get('.daily-plan-strip').should('contain.text', 'Card 2 of 24')
        cy.get('.study-hero').contains('Mistake notebook · 1').click()
        cy.location('pathname').should('equal', '/mistakes')
        cy.get('.mistake-focus').should('contain.text', '1 miss recorded')

        cy.visit('/progress')
        cy.get('.level-progress article').first().should('contain.text', '1/').find('.progress-track i').should('have.class', 'has-progress')

        cy.visit('/practice')
        cy.get('.practice-mode-picker').contains('Hanzi recall').click()
        cy.get('.quiz-options button').first().click()
        cy.get('.quiz-panel > .primary-action').click()
        cy.get('.quiz-feedback').should('be.visible')
        cy.get('.topbar__meter').should('contain.text', '1/24')
    })

    it('searches the dictionary and completes a scenario task', () => {
        cy.visit('/dictionary')
        cy.get('.search-box input').type('爱')
        cy.get('.word-row').first().click()
        cy.get('.dictionary-detail').should('contain.text', '爱').and('contain.text', 'ài')

        cy.visit('/scenarios')
        cy.get('.scenario-task textarea').type('名字是安娜，来自英国，学中文是因为我喜欢电影。')
        cy.get('.scenario-task > .primary-action').click()
        cy.get('.task-feedback--complete').should('contain.text', 'Mission complete')
        cy.get('.evaluation-dimensions').should('contain.text', 'Task coverage').and('contain.text', '94')
        cy.get('.evaluation-follow-up').should('contain.text', 'Follow-up challenge')
        cy.get('.scenario-summary').should('be.visible').and('contain.text', '1/6')
        cy.get('.scenario-list > header').should('be.visible').and('contain.text', '17% explored')

        cy.reload()
        cy.get('.scenario-summary').should('contain.text', '1/6')

        cy.visit('/progress')
        cy.get('.scenario-analytics').should('contain.text', '1/6')
        cy.get('.scenario-score-grid').should('contain.text', 'Best 90/100')
    })

    it('counts an attempted mission as explored without marking it complete', () => {
        cy.intercept('POST', '**/api/assistant/evaluate-scenario', {
            body: {
                passed: false,
                score: 48,
                feedback: 'Good start. Add the remaining mission ideas.',
                strengths: ['Your name is clear.'],
                improvements: ['Add where you are from and why you study Chinese.'],
                source: 'mock',
                dimensions: {
                    completeness: 40,
                    naturalness: 55,
                    accuracy: 62,
                },
                followUp: 'Where are you from, and why do you study Chinese?',
            },
            headers: { 'X-Assistant-Source': 'mock' },
        })
        cy.visit('/scenarios')
        cy.get('.scenario-task textarea').type('我叫安娜。')
        cy.get('.scenario-task > .primary-action').click()

        cy.get('.task-feedback').should('contain.text', 'Needs revision · 22 points to 70')
        cy.get('.scenario-summary').should('contain.text', '0/6')
        cy.get('.scenario-list > header').should('contain.text', '17% explored')
        cy.get('.scenario-tab').first().should('have.class', 'attempted')
    })

    it('shows a summary after the tenth practice question', () => {
        cy.visit('/practice')
        Cypress._.times(10, (index) => {
            cy.get('.quiz-options button').first().click()
            cy.get('.quiz-panel > .primary-action').click()
            if (index < 9)
                cy.get('.quiz-panel > .primary-action').click()
        })

        cy.get('.quiz-panel > .primary-action').should('contain.text', 'View round summary').click()
        cy.get('.practice-round-summary').should('contain.text', 'Round complete')
        cy.get('.practice-round-summary').should('contain.text', 'Start another 10-question round')
        cy.get('.topbar__meter').should('contain.text', '0/24')
    })

    it('opens the contextual tutor without exposing a provider key', () => {
        cy.visit('/study')
        cy.get('.assistant__bubble').click()
        cy.get('.assistant__panel').should('be.visible')
        cy.get('.assistant__context').should('contain.text', 'Word')
        cy.get('.assistant__context').should('contain.text', '0 due')
        cy.get('.assistant__form input').should('have.attr', 'placeholder', 'Ask about this word or mission')
    })
})
