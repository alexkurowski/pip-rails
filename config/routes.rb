Rails.application.routes.draw do
  root 'maps#index'

  resource :potholes, only: [:create, :update]
  controller :potholes do
    post '/potholes/in_bounds'
  end
end
