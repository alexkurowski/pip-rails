Rails.application.routes.draw do
  root 'maps#index'

  resource :potholes, only: [:create, :update]
end
